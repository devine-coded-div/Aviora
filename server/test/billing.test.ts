import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { sweep } from '../src/jobs/cleanup.ts'
import { hashToken } from '../src/jobs/tokens.ts'
import { MemoryStorage } from '../src/storage/memory.ts'
import {
  buildTestApp,
  fakeProvider,
  FakeRazorpay,
  jpeg,
  newAccount,
  resetDb,
  TEST_KEY_SECRET,
  TEST_WEBHOOK_SECRET,
  testClock,
  testConfig,
  testDb,
} from './helpers.ts'

beforeEach(resetDb)

type Ctx = ReturnType<typeof buildTestApp>

/** Billing tests use real limits: 3 free generations per day. */
function billingApp(opts: Parameters<typeof buildTestApp>[0] = {}) {
  return buildTestApp({ config: testConfig({ FREE_GENERATIONS_PER_DAY: '3' }), ...opts })
}

async function generate(ctx: Ctx, token: string, styleId = 'anime-classic') {
  return request(ctx.app)
    .post('/api/generations')
    .set('X-Account-Token', token)
    .field('styleId', styleId)
    .attach('image', await jpeg(400, 400), 'me.jpg')
}

const me = (ctx: Ctx, token: string) =>
  request(ctx.app).get('/api/account').set('X-Account-Token', token)

async function runWorker(ctx: Ctx) {
  await ctx.worker.tick()
  await ctx.worker.drain()
}

/** The cached balance must always equal the sum of the ledger. */
async function expectLedgerMatches(token: string) {
  const db = testDb()
  const account = await db.account.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } })
  const { _sum } = await db.creditLedger.aggregate({
    _sum: { delta: true },
    where: { accountId: account.id },
  })
  expect(account.credits).toBe(_sum.delta ?? 0)
  expect(account.credits).toBeGreaterThanOrEqual(0)
  return account.credits
}

describe('accounts', () => {
  it('creates an anonymous account and stores only a hash of its token', async () => {
    const ctx = billingApp()
    const res = await request(ctx.app).post('/api/accounts')
    expect(res.status).toBe(201)
    expect(res.body.account).toMatchObject({
      credits: 0,
      free: { limit: 3, used: 0, remaining: 3, resetsAt: null },
    })
    const row = await ctx.db.account.findFirstOrThrow()
    expect(row.tokenHash).toBe(hashToken(res.body.token))
    expect(JSON.stringify(row)).not.toContain(res.body.token)
  })

  it('requires a valid account for account info and new generations', async () => {
    const ctx = billingApp()
    for (const res of [
      await request(ctx.app).get('/api/account'),
      await request(ctx.app).get('/api/account').set('X-Account-Token', 'x'.repeat(43)),
      await request(ctx.app)
        .post('/api/generations')
        .field('styleId', 'anime-classic')
        .attach('image', await jpeg(), 'a.jpg'),
    ]) {
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('account-required')
    }
  })
})

describe('free quota (server-enforced)', () => {
  it('allows 3 free generations per rolling day, then asks for credits', async () => {
    const clock = testClock()
    const ctx = billingApp({ clock })
    const token = await newAccount(ctx.app)

    for (let i = 0; i < 3; i++) {
      const res = await generate(ctx, token)
      expect(res.status).toBe(202)
      expect(res.body.charge).toEqual({ type: 'free', refunded: false })
      await runWorker(ctx)
    }
    const fourth = await generate(ctx, token)
    expect(fourth.status).toBe(402)
    expect(fourth.body.error).toEqual({
      code: 'payment-required',
      message: expect.stringMatching(/free generations/),
    })

    const view = (await me(ctx, token)).body
    expect(view.free).toMatchObject({ limit: 3, used: 3, remaining: 0 })
    expect(new Date(view.free.resetsAt).getTime()).toBe(clock.now().getTime() + 24 * 3_600_000)

    clock.advance(24 * 3_600_000 + 1)
    expect((await generate(ctx, token)).status).toBe(202)
  })

  it('counts free use per network too, so new accounts don’t reset it', async () => {
    const ctx = billingApp()
    const first = await newAccount(ctx.app)
    for (let i = 0; i < 3; i++) {
      await generate(ctx, first)
      await runWorker(ctx)
    }
    const second = await newAccount(ctx.app)
    expect((await me(ctx, second)).body.free.remaining).toBe(0)
    expect((await generate(ctx, second)).status).toBe(402)
  })

  it('isn’t reset by deleting completed jobs', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    for (let i = 0; i < 3; i++) {
      const { id, token: jobToken } = (await generate(ctx, token)).body
      await runWorker(ctx)
      await request(ctx.app)
        .delete(`/api/generations/${id}`)
        .auth(jobToken, { type: 'bearer' })
        .expect(204)
    }
    expect((await generate(ctx, token)).status).toBe(402)
  })

  it('can’t be over-used by parallel requests', async () => {
    const ctx = billingApp({
      config: testConfig({ FREE_GENERATIONS_PER_DAY: '3', MAX_ACTIVE_JOBS_PER_CLIENT: '100' }),
    })
    const token = await newAccount(ctx.app)
    const results = await Promise.all(Array.from({ length: 8 }, () => generate(ctx, token)))
    expect(results.filter((r) => r.status === 202)).toHaveLength(3)
    expect(results.filter((r) => r.status === 402)).toHaveLength(5)
  })
})

describe('credits', () => {
  it('always charges a credit for premium styles, even with free generations left', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const denied = await generate(ctx, token, 'pixel-8bit')
    expect(denied.status).toBe(402)
    expect(denied.body.error.message).toMatch(/Premium/)

    const rich = await newAccount(ctx.app, 2)
    const res = await generate(ctx, rich, 'pixel-8bit')
    expect(res.status).toBe(202)
    expect(res.body.charge).toEqual({ type: 'credit', refunded: false })
    expect((await me(ctx, rich)).body).toMatchObject({ credits: 1, free: { remaining: 3 } })
    await expectLedgerMatches(rich)
  })

  it('uses credits for free styles once the free quota is used', async () => {
    const ctx = billingApp({ config: testConfig({ FREE_GENERATIONS_PER_DAY: '1' }) })
    const token = await newAccount(ctx.app, 5)
    expect((await generate(ctx, token)).body.charge.type).toBe('free')
    await runWorker(ctx)
    expect((await generate(ctx, token)).body.charge.type).toBe('credit')
    expect((await me(ctx, token)).body.credits).toBe(4)
  })

  it('never goes negative under parallel spending', async () => {
    const ctx = billingApp({ config: testConfig({ MAX_ACTIVE_JOBS_PER_CLIENT: '100' }) })
    const token = await newAccount(ctx.app, 2)
    const results = await Promise.all(
      Array.from({ length: 7 }, () => generate(ctx, token, 'pixel-8bit')),
    )
    expect(results.filter((r) => r.status === 202)).toHaveLength(2)
    expect(await expectLedgerMatches(token)).toBe(0)
  })

  it('refunds a failed generation exactly once', async () => {
    const fake = fakeProvider()
    const ctx = billingApp({
      provider: fake.provider,
      config: testConfig({ JOB_MAX_ATTEMPTS: '1' }),
    })
    const token = await newAccount(ctx.app, 3)
    const { id, token: jobToken } = (await generate(ctx, token, 'pixel-8bit')).body
    fake.fail('content-rejected')
    await runWorker(ctx)

    // Other refund paths run too; none may refund again.
    await sweep(ctx)
    await sweep(ctx)
    await request(ctx.app)
      .delete(`/api/generations/${id}`)
      .auth(jobToken, { type: 'bearer' })
      .expect(204)

    expect((await me(ctx, token)).body.credits).toBe(3)
    const refunds = await ctx.db.creditLedger.count({ where: { jobId: id, reason: 'REFUND' } })
    expect(refunds).toBe(1)
    await expectLedgerMatches(token)
  })

  it('gives back a free use when a free generation fails', async () => {
    const fake = fakeProvider()
    const ctx = billingApp({
      provider: fake.provider,
      config: testConfig({ FREE_GENERATIONS_PER_DAY: '3', JOB_MAX_ATTEMPTS: '1' }),
    })
    const token = await newAccount(ctx.app)
    await generate(ctx, token)
    fake.fail('unavailable')
    await runWorker(ctx)
    expect((await me(ctx, token)).body.free.remaining).toBe(3)
  })

  it('refunds jobs deleted before finishing, but not completed ones', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app, 2)
    const pending = (await generate(ctx, token, 'pixel-8bit')).body
    await request(ctx.app)
      .delete(`/api/generations/${pending.id}`)
      .auth(pending.token, { type: 'bearer' })
      .expect(204)
    expect((await me(ctx, token)).body.credits).toBe(2)

    const done = (await generate(ctx, token, 'pixel-8bit')).body
    await runWorker(ctx)
    await request(ctx.app)
      .delete(`/api/generations/${done.id}`)
      .auth(done.token, { type: 'bearer' })
      .expect(204)
    expect((await me(ctx, token)).body.credits).toBe(1)
    await expectLedgerMatches(token)
  })

  it('charges a manual retry as a new cycle and refunds it separately if it fails', async () => {
    const fake = fakeProvider()
    const ctx = billingApp({
      provider: fake.provider,
      config: testConfig({ JOB_MAX_ATTEMPTS: '1' }),
    })
    const token = await newAccount(ctx.app, 1)
    const { id, token: jobToken } = (await generate(ctx, token, 'pixel-8bit')).body
    fake.fail('unavailable')
    await runWorker(ctx)
    expect((await me(ctx, token)).body.credits).toBe(1)

    await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(jobToken, { type: 'bearer' })
      .expect(202)
    expect((await me(ctx, token)).body.credits).toBe(0)
    fake.fail('unavailable')
    await runWorker(ctx)
    expect((await me(ctx, token)).body.credits).toBe(1)

    const keys = (
      await ctx.db.creditLedger.findMany({ where: { jobId: id }, orderBy: { createdAt: 'asc' } })
    ).map((e) => e.idempotencyKey)
    expect(keys).toEqual([`charge:${id}:0`, `refund:${id}:0`, `charge:${id}:1`, `refund:${id}:1`])
  })

  it('refuses a manual retry without credits', async () => {
    const fake = fakeProvider()
    const ctx = billingApp({
      provider: fake.provider,
      config: testConfig({ JOB_MAX_ATTEMPTS: '1' }),
    })
    const token = await newAccount(ctx.app, 1)
    const first = (await generate(ctx, token, 'pixel-8bit')).body
    fake.fail('unavailable')
    await runWorker(ctx)
    await generate(ctx, token, 'pixel-8bit') // spends the refunded credit

    const retry = await request(ctx.app)
      .post(`/api/generations/${first.id}/retry`)
      .auth(first.token, { type: 'bearer' })
    expect(retry.status).toBe(402)
    expect(
      (
        await request(ctx.app)
          .get(`/api/generations/${first.id}`)
          .auth(first.token, { type: 'bearer' })
      ).body.status,
    ).toBe('failed')
    await expectLedgerMatches(token)
  })

  it('refunds jobs failed by stale-job recovery', async () => {
    const clock = testClock()
    const ctx = billingApp({ clock, config: testConfig({ JOB_MAX_ATTEMPTS: '1' }) })
    const token = await newAccount(ctx.app, 1)
    await generate(ctx, token, 'pixel-8bit')
    await ctx.worker.claim()
    clock.advance(ctx.config.JOB_PROCESSING_TIMEOUT_MS + 1)
    await ctx.worker.recoverStale()
    expect((await me(ctx, token)).body.credits).toBe(1)
  })
})

describe('credit packs and Razorpay orders', () => {
  it('lists server-defined packs in test mode without exposing secrets', async () => {
    const ctx = billingApp()
    const res = await request(ctx.app).get('/api/billing/packs')
    expect(res.body).toEqual({
      paymentsEnabled: true,
      testMode: true,
      keyId: 'rzp_test_FAKEKEY123',
      currency: 'INR',
      packs: [
        { id: 'starter', name: 'Starter', credits: 10, amount: 9900, currency: 'INR' },
        { id: 'creator', name: 'Creator', credits: 30, amount: 24900, currency: 'INR' },
        { id: 'pro', name: 'Pro', credits: 100, amount: 69900, currency: 'INR' },
      ],
    })
    expect(JSON.stringify(res.body)).not.toContain(TEST_KEY_SECRET)
    expect(JSON.stringify(res.body)).not.toContain(TEST_WEBHOOK_SECRET)
  })

  it('creates a Razorpay order with the server’s price, whatever the client sends', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const res = await request(ctx.app)
      .post('/api/billing/orders')
      .set('X-Account-Token', token)
      .send({ packId: 'creator', amount: 1, credits: 9999 })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      packId: 'creator',
      credits: 30,
      amount: 24900,
      currency: 'INR',
      status: 'created',
      keyId: 'rzp_test_FAKEKEY123',
    })
    const gateway = ctx.gateway as FakeRazorpay
    expect(gateway.orders.get(res.body.razorpayOrderId)?.amount).toBe(24900)
  })

  it('rejects unknown packs, missing accounts and gateway failures', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const unknown = await request(ctx.app)
      .post('/api/billing/orders')
      .set('X-Account-Token', token)
      .send({ packId: 'free-money' })
    expect(unknown.status).toBe(422)
    expect(
      (await request(ctx.app).post('/api/billing/orders').send({ packId: 'starter' })).status,
    ).toBe(401)

    ;(ctx.gateway as FakeRazorpay).failNextCreate = true
    const down = await request(ctx.app)
      .post('/api/billing/orders')
      .set('X-Account-Token', token)
      .send({ packId: 'starter' })
    expect(down.status).toBe(502)
    expect(await ctx.db.paymentOrder.count()).toBe(0)
  })

  it('reports payments as disabled when Razorpay isn’t configured', async () => {
    const config = testConfig({
      RAZORPAY_KEY_ID: '',
      RAZORPAY_KEY_SECRET: '',
      RAZORPAY_WEBHOOK_SECRET: '',
    })
    const ctx = buildTestApp({ config, gateway: null })
    expect((await request(ctx.app).get('/api/billing/packs')).body.paymentsEnabled).toBe(false)
    const token = await newAccount(ctx.app)
    const res = await request(ctx.app)
      .post('/api/billing/orders')
      .set('X-Account-Token', token)
      .send({ packId: 'starter' })
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('payments-disabled')
  })
})

describe('payment verification', () => {
  async function startOrder(ctx: Ctx, token: string, packId = 'starter') {
    return (
      await request(ctx.app)
        .post('/api/billing/orders')
        .set('X-Account-Token', token)
        .send({ packId })
    ).body
  }
  const verify = (ctx: Ctx, token: string, id: string, body: object) =>
    request(ctx.app)
      .post(`/api/billing/orders/${id}/verify`)
      .set('X-Account-Token', token)
      .send(body)

  it('grants credits once for a verified, captured payment', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const order = await startOrder(ctx, token)
    const { checkout } = (ctx.gateway as FakeRazorpay).pay(order.razorpayOrderId)

    const res = await verify(ctx, token, order.id, checkout)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      outcome: 'paid',
      order: { status: 'paid', credits: 10 },
      account: { credits: 10 },
    })

    // Repeated callbacks (double clicks, retries) don't grant again.
    await verify(ctx, token, order.id, checkout).expect(200)
    await verify(ctx, token, order.id, checkout).expect(200)
    expect((await me(ctx, token)).body.credits).toBe(10)
    expect(await ctx.db.creditLedger.count({ where: { reason: 'PURCHASE' } })).toBe(1)
    await expectLedgerMatches(token)
  })

  it('rejects forged or mismatched signatures', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const order = await startOrder(ctx, token)
    const other = await startOrder(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay
    const { checkout } = gateway.pay(order.razorpayOrderId)

    for (const body of [
      { ...checkout, razorpaySignature: 'a'.repeat(64) },
      { ...checkout, razorpayPaymentId: 'pay_someoneelse' },
      {},
    ]) {
      const res = await verify(ctx, token, order.id, body)
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('invalid-signature')
    }
    // A valid signature for a different order can't pay this one.
    expect((await verify(ctx, token, other.id, checkout)).status).toBe(400)
    expect((await me(ctx, token)).body.credits).toBe(0)
  })

  it('hides other accounts’ orders', async () => {
    const ctx = billingApp()
    const owner = await newAccount(ctx.app)
    const intruder = await newAccount(ctx.app)
    const order = await startOrder(ctx, owner)
    const { checkout } = (ctx.gateway as FakeRazorpay).pay(order.razorpayOrderId)
    expect((await verify(ctx, intruder, order.id, checkout)).status).toBe(404)
    expect(
      (
        await request(ctx.app)
          .get(`/api/billing/orders/${order.id}`)
          .set('X-Account-Token', intruder)
      ).status,
    ).toBe(404)
    expect((await me(ctx, intruder)).body.credits).toBe(0)
  })

  it('treats authorized-but-not-captured payments as pending until the webhook confirms capture', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const order = await startOrder(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay
    const { checkout, payment } = gateway.pay(order.razorpayOrderId, { status: 'authorized' })

    const res = await verify(ctx, token, order.id, checkout)
    expect(res.body).toMatchObject({
      outcome: 'pending',
      order: { status: 'created' },
      account: { credits: 0 },
    })

    payment.status = 'captured'
    const hook = gateway.webhook('payment.captured', payment)
    await request(ctx.app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', hook.signature)
      .set('X-Razorpay-Event-Id', 'evt_1')
      .send(hook.body)
      .expect(200)

    const polled = await request(ctx.app)
      .get(`/api/billing/orders/${order.id}`)
      .set('X-Account-Token', token)
    expect(polled.body.status).toBe('paid')
    expect((await me(ctx, token)).body.credits).toBe(10)
  })

  it('stays pending if Razorpay can’t be reached, then completes via webhook', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const order = await startOrder(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay
    const { checkout, payment } = gateway.pay(order.razorpayOrderId)
    gateway.failLookups = true

    expect((await verify(ctx, token, order.id, checkout)).body.outcome).toBe('pending')
    expect((await me(ctx, token)).body.credits).toBe(0)

    const hook = gateway.webhook('order.paid', payment)
    await request(ctx.app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', hook.signature)
      .set('X-Razorpay-Event-Id', 'evt_2')
      .send(hook.body)
      .expect(200)
    expect((await me(ctx, token)).body.credits).toBe(10)
  })

  it('records a failed payment without closing the order, so the user can pay again', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const order = await startOrder(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay

    const failed = gateway.pay(order.razorpayOrderId, { status: 'failed' })
    const res = await verify(ctx, token, order.id, failed.checkout)
    expect(res.body).toMatchObject({
      outcome: 'failed',
      order: { status: 'created', failureReason: 'Payment declined by bank' },
      account: { credits: 0 },
    })

    const retry = gateway.pay(order.razorpayOrderId)
    expect((await verify(ctx, token, order.id, retry.checkout)).body).toMatchObject({
      outcome: 'paid',
      order: { status: 'paid', failureReason: null },
    })
    expect((await me(ctx, token)).body.credits).toBe(10)
  })

  it('refuses captured payments with the wrong amount', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const order = await startOrder(ctx, token, 'pro')
    const { checkout } = (ctx.gateway as FakeRazorpay).pay(order.razorpayOrderId, { amount: 100 })
    const res = await verify(ctx, token, order.id, checkout)
    expect(res.body).toMatchObject({
      outcome: 'failed',
      order: { status: 'failed', failureReason: 'amount-mismatch' },
    })
    expect((await me(ctx, token)).body.credits).toBe(0)
  })
})

describe('Razorpay webhooks', () => {
  async function paidPayment(ctx: Ctx, token: string) {
    const order = (
      await request(ctx.app)
        .post('/api/billing/orders')
        .set('X-Account-Token', token)
        .send({ packId: 'starter' })
    ).body
    return { order, ...(ctx.gateway as FakeRazorpay).pay(order.razorpayOrderId) }
  }
  const send = (ctx: Ctx, hook: { body: string; signature: string }, eventId?: string) => {
    const req = request(ctx.app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', hook.signature)
    return (eventId ? req.set('X-Razorpay-Event-Id', eventId) : req).send(hook.body)
  }

  it('grants credits from a signed payment.captured event', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const { payment } = await paidPayment(ctx, token)
    const res = await send(
      ctx,
      (ctx.gateway as FakeRazorpay).webhook('payment.captured', payment),
      'evt_a',
    )
    expect(res.body).toEqual({ status: 'processed' })
    expect((await me(ctx, token)).body.credits).toBe(10)
  })

  it('rejects bad signatures and tampered bodies', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const { payment } = await paidPayment(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay

    const wrongSecret = gateway.webhook('payment.captured', payment, 'not-the-secret')
    expect((await send(ctx, wrongSecret, 'evt_b')).status).toBe(400)

    const hook = gateway.webhook('payment.captured', payment)
    const tampered = {
      body: hook.body.replace('"amount":9900', '"amount":1'),
      signature: hook.signature,
    }
    expect((await send(ctx, tampered, 'evt_c')).status).toBe(400)
    expect((await me(ctx, token)).body.credits).toBe(0)
    expect(await ctx.db.webhookEvent.count()).toBe(0)
  })

  it('ignores replayed events and grants once across overlapping events', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const { payment, checkout, order } = await paidPayment(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay
    const captured = gateway.webhook('payment.captured', payment)

    expect((await send(ctx, captured, 'evt_same')).body.status).toBe('processed')
    expect((await send(ctx, captured, 'evt_same')).body.status).toBe('duplicate')
    // Same payment reported by a different event, and by the checkout callback.
    expect((await send(ctx, gateway.webhook('order.paid', payment), 'evt_other')).body.status).toBe(
      'processed',
    )
    await request(ctx.app)
      .post(`/api/billing/orders/${order.id}/verify`)
      .set('X-Account-Token', token)
      .send(checkout)
      .expect(200)

    expect((await me(ctx, token)).body.credits).toBe(10)
    expect(await ctx.db.creditLedger.count({ where: { reason: 'PURCHASE' } })).toBe(1)
  })

  it('handles concurrent deliveries of the same payment without double-granting', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const { payment } = await paidPayment(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay
    await Promise.all(
      ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) =>
        send(ctx, gateway.webhook('payment.captured', payment), id),
      ),
    )
    expect((await me(ctx, token)).body.credits).toBe(10)
    await expectLedgerMatches(token)
  })

  it('ignores a late failure event for an order that is already paid', async () => {
    const ctx = billingApp()
    const token = await newAccount(ctx.app)
    const { payment, order } = await paidPayment(ctx, token)
    const gateway = ctx.gateway as FakeRazorpay
    await send(ctx, gateway.webhook('payment.captured', payment), 'evt_ok')
    await send(
      ctx,
      gateway.webhook('payment.failed', { ...payment, status: 'failed' }),
      'evt_late_fail',
    )

    const view = (
      await request(ctx.app).get(`/api/billing/orders/${order.id}`).set('X-Account-Token', token)
    ).body
    expect(view).toMatchObject({ status: 'paid', failureReason: null })
    expect((await me(ctx, token)).body.credits).toBe(10)
  })

  it('accepts events for unknown orders without effect', async () => {
    const ctx = billingApp()
    const hook = (ctx.gateway as FakeRazorpay).webhook('payment.captured', {
      id: 'pay_x',
      order_id: 'order_unknown',
      amount: 9900,
      currency: 'INR',
      status: 'captured',
    })
    expect((await send(ctx, hook, 'evt_unknown')).body).toEqual({ status: 'ignored' })
  })

  it('still honours a payment that lands after the order expired', async () => {
    const clock = testClock()
    const ctx = billingApp({ clock })
    const token = await newAccount(ctx.app)
    const { payment, order } = await paidPayment(ctx, token)
    clock.advance(ctx.config.ORDER_EXPIRY_MINUTES * 60_000 + 1)
    expect(await ctx.payments.expireStale()).toBe(1)
    expect(
      (await request(ctx.app).get(`/api/billing/orders/${order.id}`).set('X-Account-Token', token))
        .body.status,
    ).toBe('expired')

    await send(ctx, (ctx.gateway as FakeRazorpay).webhook('payment.captured', payment), 'evt_late')
    expect((await me(ctx, token)).body.credits).toBe(10)
  })
})

describe('end to end: buy, then generate premium', () => {
  it('a purchase unlocks premium generations', async () => {
    const storage = new MemoryStorage()
    const ctx = billingApp({ storage })
    const token = await newAccount(ctx.app)
    expect((await generate(ctx, token, 'realistic-studio')).status).toBe(402)

    const order = (
      await request(ctx.app)
        .post('/api/billing/orders')
        .set('X-Account-Token', token)
        .send({ packId: 'starter' })
    ).body
    const { checkout } = (ctx.gateway as FakeRazorpay).pay(order.razorpayOrderId)
    await request(ctx.app)
      .post(`/api/billing/orders/${order.id}/verify`)
      .set('X-Account-Token', token)
      .send(checkout)
      .expect(200)

    const job = await generate(ctx, token, 'realistic-studio')
    expect(job.status).toBe(202)
    await runWorker(ctx)
    expect(
      (
        await request(ctx.app)
          .get(`/api/generations/${job.body.id}`)
          .auth(job.body.token, { type: 'bearer' })
      ).body.status,
    ).toBe('completed')
    expect(await expectLedgerMatches(token)).toBe(9)
  })
})
