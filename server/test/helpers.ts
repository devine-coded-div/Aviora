import sharp from 'sharp'
import { inject, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { AccountService } from '../src/billing/accounts.ts'
import { PaymentService } from '../src/billing/payments.ts'
import {
  paymentSignature,
  webhookSignature,
  type PaymentGateway,
  type RazorpayOrder,
  type RazorpayPayment,
} from '../src/billing/razorpay.ts'
import { loadConfig, type Config } from '../src/config.ts'
import { createDb, type Db } from '../src/db.ts'
import { createApp } from '../src/http/app.ts'
import { JobService } from '../src/jobs/service.ts'
import { JobWorker } from '../src/jobs/worker.ts'
import {
  ProviderError,
  type AvatarProvider,
  type GenerateInput,
  type GenerateOutput,
  type ProviderErrorKind,
  type ProviderInfo,
} from '../src/providers/types.ts'
import { MemoryStorage } from '../src/storage/memory.ts'
import { S3Storage } from '../src/storage/s3.ts'
import type { ObjectStorage } from '../src/storage/types.ts'
import { STYLE_IDS } from '../src/styles.ts'

let sharedDb: Db | null = null
export function testDb(): Db {
  sharedDb ??= createDb(inject('databaseUrl'))
  return sharedDb
}

export async function resetDb() {
  const db = testDb()
  await db.generationJob.deleteMany()
  await db.freeUsage.deleteMany()
  await db.webhookEvent.deleteMany()
  await db.creditLedger.deleteMany()
  await db.paymentOrder.deleteMany()
  await db.account.deleteMany()
}

export const TEST_KEY_SECRET = 'test_key_secret_abc123'
export const TEST_WEBHOOK_SECRET = 'test_webhook_secret_xyz789'

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: inject('databaseUrl'),
    STORAGE_DRIVER: 'memory',
    CORS_ORIGINS: 'https://app.example',
    GENERATIONS_PER_HOUR: '100',
    MAX_ACTIVE_JOBS_PER_CLIENT: '10',
    API_REQUESTS_PER_MINUTE: '1000',
    JOB_RETRY_BASE_MS: '1000',
    // Generous by default so non-billing tests aren't limited; billing tests set real values.
    FREE_GENERATIONS_PER_DAY: '1000',
    ACCOUNTS_PER_HOUR: '1000',
    ORDERS_PER_HOUR: '1000',
    RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123',
    RAZORPAY_KEY_SECRET: TEST_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    ...overrides,
  })
}

export function s3Storage(prefix = `test-${Date.now()}/`) {
  return new S3Storage({
    bucket: inject('s3Bucket'),
    region: 'us-east-1',
    endpoint: inject('s3Endpoint'),
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER',
    forcePathStyle: true,
    keyPrefix: prefix,
  })
}

/** A controllable clock. */
export function testClock(start = new Date('2026-11-13T12:00:00Z')) {
  let t = start.getTime()
  return {
    now: () => new Date(t),
    advance: (ms: number) => {
      t += ms
    },
  }
}

type Behaviour =
  | { type: 'ok' }
  | { type: 'fail'; kind: ProviderErrorKind }
  | { type: 'wait'; until: Promise<void> }

/**
 * A provider whose outcome each test scripts: succeed, fail with a given kind, or wait until
 * released. Records every call.
 */
export function fakeProvider(info: Partial<ProviderInfo> = {}) {
  const queue: Behaviour[] = []
  const calls: GenerateInput[] = []
  const provider: AvatarProvider = {
    info: {
      id: 'fake',
      name: 'Fake provider',
      kind: 'mock',
      styles: STYLE_IDS,
      costPerImageUsd: 0,
      retentionDays: 0,
      trainsOnInputs: false,
      ...info,
    },
    async generate(input): Promise<GenerateOutput> {
      calls.push(input)
      const next = queue.shift() ?? { type: 'ok' }
      if (next.type === 'wait') await next.until
      if (next.type === 'fail') throw new ProviderError(next.kind, `scripted ${next.kind}`)
      const image = await sharp(input.image).negate({ alpha: false }).png().toBuffer()
      return { image, mime: 'image/png' }
    },
  }
  return {
    provider,
    calls,
    succeed: () => queue.push({ type: 'ok' }),
    fail: (kind: ProviderErrorKind) => queue.push({ type: 'fail', kind }),
    /** The next call waits until `release()` is called. */
    hold() {
      let release!: () => void
      queue.push({ type: 'wait', until: new Promise<void>((r) => (release = r)) })
      return () => release()
    },
  }
}

/**
 * In-memory stand-in for Razorpay's Orders/Payments API. Signatures are produced exactly as
 * Razorpay documents them, with the test secrets, so the server's verification is exercised.
 */
export class FakeRazorpay implements PaymentGateway {
  readonly orders = new Map<string, RazorpayOrder>()
  readonly payments = new Map<string, RazorpayPayment>()
  failNextCreate = false
  failLookups = false

  async createOrder(input: { amount: number; currency: string }): Promise<RazorpayOrder> {
    if (this.failNextCreate) {
      this.failNextCreate = false
      throw new Error('gateway down')
    }
    const order = {
      id: `order_${randomUUID().slice(0, 14)}`,
      amount: input.amount,
      currency: input.currency,
      status: 'created',
    }
    this.orders.set(order.id, order)
    return order
  }

  async fetchPayment(id: string): Promise<RazorpayPayment> {
    if (this.failLookups) throw new Error('gateway timeout')
    const payment = this.payments.get(id)
    if (!payment) throw new Error('not found')
    return payment
  }

  /** The customer completes checkout. Returns what Checkout hands to the browser. */
  pay(
    razorpayOrderId: string,
    opts: { status?: RazorpayPayment['status']; amount?: number; currency?: string } = {},
  ) {
    const order = this.orders.get(razorpayOrderId)!
    const payment: RazorpayPayment = {
      id: `pay_${randomUUID().slice(0, 14)}`,
      order_id: razorpayOrderId,
      amount: opts.amount ?? order.amount,
      currency: opts.currency ?? order.currency,
      status: opts.status ?? 'captured',
      error_description: opts.status === 'failed' ? 'Payment declined by bank' : null,
    }
    this.payments.set(payment.id, payment)
    return {
      payment,
      checkout: {
        razorpayOrderId,
        razorpayPaymentId: payment.id,
        razorpaySignature: paymentSignature(razorpayOrderId, payment.id, TEST_KEY_SECRET),
      },
    }
  }

  /** A signed webhook request body, as Razorpay would send it. */
  webhook(event: string, payment: RazorpayPayment, secret = TEST_WEBHOOK_SECRET) {
    const body = JSON.stringify({
      entity: 'event',
      event,
      payload: {
        payment: { entity: payment },
        ...(event === 'order.paid'
          ? { order: { entity: { id: payment.order_id, status: 'paid' } } }
          : {}),
      },
      created_at: Math.floor(Date.now() / 1000),
    })
    return { body, signature: webhookSignature(body, secret) }
  }
}

export function buildTestApp(
  options: {
    config?: Config
    storage?: ObjectStorage
    provider?: AvatarProvider
    clock?: ReturnType<typeof testClock>
    gateway?: PaymentGateway | null
  } = {},
) {
  const config = options.config ?? testConfig()
  const storage = options.storage ?? new MemoryStorage()
  const provider = options.provider ?? fakeProvider().provider
  const clock = options.clock ?? testClock(new Date())
  const db = testDb()
  const log = {
    info: vi.fn<(...args: unknown[]) => void>(),
    warn: vi.fn<(...args: unknown[]) => void>(),
    error: vi.fn<(...args: unknown[]) => void>(),
  }
  const service = new JobService({ db, storage, provider, config, now: clock.now })
  const gateway = options.gateway === undefined ? new FakeRazorpay() : options.gateway
  const accounts = new AccountService({ db, config, now: clock.now })
  const payments = new PaymentService({ db, gateway, config, now: clock.now, log })
  const worker = new JobWorker({ db, storage, provider, config, now: clock.now, log })
  // Tests drive the worker explicitly (tick/drain) for deterministic lifecycles.
  const app = createApp({
    config,
    db,
    provider,
    service,
    accounts,
    payments,
    worker: { kick: () => {} },
    clientSecret: 'test-client-secret-0123456789',
    log,
  })
  return {
    app,
    config,
    storage,
    provider,
    service,
    worker,
    clock,
    db,
    log,
    gateway,
    accounts,
    payments,
  }
}

export async function jpeg(width = 800, height = 800, withGps = false) {
  let img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 80 } } })
  if (withGps) {
    img = img.withExif({
      IFD0: { Make: 'SecretCam', Model: 'X100' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '28/1 36/1 0/1' },
    })
  }
  return img.jpeg().toBuffer()
}

export const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: '#3366ff' } })
    .png()
    .toBuffer()

/** Create an account through the API; optionally seed credits (through the ledger, like a purchase). */
export async function newAccount(app: Parameters<typeof request>[0], credits = 0) {
  const res = await request(app).post('/api/accounts')
  const token = res.body.token as string
  if (credits > 0) {
    const db = testDb()
    const { id } = await db.account.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
      where: {},
      select: { id: true },
    })
    await db.account.update({ where: { id }, data: { credits } })
    await db.creditLedger.create({
      data: {
        id: randomUUID(),
        accountId: id,
        delta: credits,
        reason: 'PURCHASE',
        idempotencyKey: `seed:${id}`,
        balanceAfter: credits,
      },
    })
  }
  return token
}

const accountByApp = new WeakMap<object, Promise<string>>()
/** One account per test app, with credits so premium styles work in non-billing tests. */
export function accountFor(app: Parameters<typeof request>[0]): Promise<string> {
  let token = accountByApp.get(app as object)
  if (!token) {
    token = newAccount(app, 100)
    accountByApp.set(app as object, token)
  }
  return token
}
