import sharp from 'sharp'
import { inject, vi } from 'vitest'
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
  await testDb().generationJob.deleteMany()
}

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

export function buildTestApp(
  options: {
    config?: Config
    storage?: ObjectStorage
    provider?: AvatarProvider
    clock?: ReturnType<typeof testClock>
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
  const worker = new JobWorker({ db, storage, provider, config, now: clock.now, log })
  // Tests drive the worker explicitly (tick/drain) for deterministic lifecycles.
  const app = createApp({
    config,
    db,
    provider,
    service,
    worker: { kick: () => {} },
    clientSecret: 'test-client-secret-0123456789',
    log,
  })
  return { app, config, storage, provider, service, worker, clock, db, log }
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
