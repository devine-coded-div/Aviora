import request from 'supertest'
import sharp from 'sharp'
import { beforeEach, describe, expect, it } from 'vitest'
import { hashToken } from '../src/jobs/tokens.ts'
import { MemoryStorage } from '../src/storage/memory.ts'
import {
  accountFor,
  buildTestApp,
  fakeProvider,
  jpeg,
  png,
  resetDb,
  testClock,
  testConfig,
} from './helpers.ts'

beforeEach(resetDb)

type Ctx = ReturnType<typeof buildTestApp>

async function create(ctx: Ctx, styleId = 'anime-classic', image?: Buffer) {
  const res = await request(ctx.app)
    .post('/api/generations')
    .set('X-Account-Token', await accountFor(ctx.app))
    .field('styleId', styleId)
    .attach('image', image ?? (await jpeg()), 'me.jpg')
  return res
}

const status = (ctx: Ctx, id: string, token: string) =>
  request(ctx.app).get(`/api/generations/${id}`).auth(token, { type: 'bearer' })

async function runWorker(ctx: Ctx) {
  await ctx.worker.tick()
  await ctx.worker.drain()
}

describe('POST /api/generations', () => {
  it('accepts a valid upload and returns a pending job with a one-time token', async () => {
    const ctx = buildTestApp()
    const res = await create(ctx)

    expect(res.status).toBe(202)
    expect(res.headers['location']).toBe(`/api/generations/${res.body.id}`)
    expect(res.body).toMatchObject({
      status: 'pending',
      styleId: 'anime-classic',
      attempts: 0,
      result: null,
      error: null,
    })
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(res.body.pollAfterMs).toBeGreaterThan(0)

    const row = await ctx.db.generationJob.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(row.tokenHash).toBe(hashToken(res.body.token))
    expect(row.tokenHash).not.toContain(res.body.token)
    expect(row.clientHash).toMatch(/^[0-9a-f]{32}$/)
    expect(row.clientHash).not.toContain('127.0.0.1')
  })

  it('stores a normalized 1024×1024 PNG with all metadata (incl. GPS) stripped', async () => {
    const storage = new MemoryStorage()
    const ctx = buildTestApp({ storage })
    const original = await jpeg(1200, 900, true)
    expect((await sharp(original).metadata()).exif).toBeDefined()

    const res = await create(ctx, 'anime-classic', original)
    const stored = storage.objects.get(`inputs/${res.body.id}.png`)!
    const meta = await sharp(stored.body).metadata()
    expect(stored.contentType).toBe('image/png')
    expect(meta).toMatchObject({ format: 'png', width: 1024, height: 1024 })
    expect(meta.exif).toBeUndefined()
    expect(stored.body.includes(Buffer.from('SecretCam'))).toBe(false)
  })

  it.each([
    ['no file', null, 400, 'missing-image'],
    ['a GIF', 'gif', 415, 'unsupported-type'],
    ['an SVG', 'svg', 415, 'unsupported-type'],
    ['text renamed to .jpg', 'text', 422, 'corrupt-image'],
    ['a 300×200 image', 'small', 422, 'image-too-small'],
    ['a 5000×400 image', 'wide', 422, 'image-too-large'],
    ['an animated WebP', 'animated', 422, 'animated-image'],
  ])('rejects %s', async (_, kind, code, errorCode) => {
    const ctx = buildTestApp()
    const files: Record<string, () => Promise<Buffer>> = {
      gif: () =>
        sharp({ create: { width: 300, height: 300, channels: 3, background: '#fff' } })
          .gif()
          .toBuffer(),
      svg: async () =>
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"/>'),
      text: async () => Buffer.from('definitely not an image'),
      small: () => png(300, 200),
      wide: () => png(5000, 400),
      animated: async () => {
        // Two *different* 300×300 frames stacked into a strip, written as a 2-page animated WebP
        // (identical frames would be merged into a static image by the encoder).
        const frame = (background: string) =>
          sharp({ create: { width: 300, height: 300, channels: 4, background } })
            .raw()
            .toBuffer()
        return sharp(Buffer.concat([await frame('#3366ff'), await frame('#ff3366')]), {
          raw: { width: 300, height: 600, channels: 4, pageHeight: 300 },
        })
          .webp({ loop: 0 })
          .toBuffer()
      },
    }
    const req = request(ctx.app)
      .post('/api/generations')
      .set('X-Account-Token', await accountFor(ctx.app))
      .field('styleId', 'anime-classic')
    const res = kind ? await req.attach('image', await files[kind]!(), 'upload.jpg') : await req
    expect(res.status).toBe(code)
    expect(res.body).toEqual({ error: { code: errorCode, message: expect.any(String) } })
    expect(await ctx.db.generationJob.count()).toBe(0)
  })

  it('rejects files over the size limit before decoding them', async () => {
    const ctx = buildTestApp({ config: testConfig({ MAX_UPLOAD_BYTES: '50000' }) })
    const res = await create(ctx, 'anime-classic', Buffer.alloc(60_000, 1))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('file-too-large')
  })

  it('rejects unknown styles', async () => {
    const res = await create(buildTestApp(), 'not-a-style')
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('unknown-style')
  })

  it('rejects styles the configured provider does not support', async () => {
    const { provider } = fakeProvider({ styles: ['anime-classic'] })
    const res = await create(buildTestApp({ provider }), 'pixel-8bit')
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('style-unavailable')
  })
})

describe('job access', () => {
  it('requires the job’s own token, and hides whether a job exists', async () => {
    const ctx = buildTestApp()
    const a = (await create(ctx)).body
    const b = (await create(ctx)).body

    expect((await status(ctx, a.id, a.token)).status).toBe(200)
    for (const res of [
      await request(ctx.app).get(`/api/generations/${a.id}`),
      await status(ctx, a.id, b.token),
      await status(ctx, a.id, 'x'.repeat(43)),
      await status(ctx, '00000000-0000-4000-8000-000000000000', a.token),
      await status(ctx, 'not-a-uuid', a.token),
    ]) {
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('not-found')
    }
  })

  it('never exposes internal fields', async () => {
    const ctx = buildTestApp()
    const { id, token } = (await create(ctx)).body
    const body = JSON.stringify((await status(ctx, id, token)).body)
    for (const field of [
      'tokenHash',
      'clientHash',
      'inputKey',
      'resultKey',
      'costMicros',
      'lockedAt',
    ]) {
      expect(body).not.toContain(field)
    }
    expect(body).not.toContain(token)
  })
})

describe('job lifecycle', () => {
  it('goes pending → processing → completed, serves the result, then deletes the input', async () => {
    const storage = new MemoryStorage()
    const fake = fakeProvider()
    const ctx = buildTestApp({ storage, provider: fake.provider })
    const { id, token } = (await create(ctx)).body
    const release = fake.hold()

    await ctx.worker.tick()
    expect((await status(ctx, id, token)).body).toMatchObject({ status: 'processing', attempts: 1 })
    expect(
      (await request(ctx.app).get(`/api/generations/${id}/result`).auth(token, { type: 'bearer' }))
        .status,
    ).toBe(409)

    release()
    await ctx.worker.drain()

    const done = (await status(ctx, id, token)).body
    expect(done).toMatchObject({
      status: 'completed',
      error: null,
      pollAfterMs: null,
      result: { url: `/api/generations/${id}/result`, mime: 'image/png' },
    })
    expect(new Date(done.result.expiresAt).getTime()).toBeGreaterThan(Date.now() + 23 * 3_600_000)
    expect(fake.calls[0]).toMatchObject({ styleId: 'anime-classic', mime: 'image/png' })

    const result = await request(ctx.app).get(done.result.url).auth(token, { type: 'bearer' })
    expect(result.status).toBe(200)
    expect(result.headers['content-type']).toBe('image/png')
    expect(result.headers['cache-control']).toBe('private, no-store')
    expect((await sharp(result.body).metadata()).width).toBe(1024)

    expect(storage.objects.has(`inputs/${id}.png`)).toBe(false)
    expect((await ctx.db.generationJob.findUniqueOrThrow({ where: { id } })).inputKey).toBeNull()
  })

  it('retries temporary provider failures with backoff, then completes', async () => {
    const fake = fakeProvider()
    const clock = testClock()
    const ctx = buildTestApp({ provider: fake.provider, clock })
    const { id, token } = (await create(ctx)).body
    fake.fail('unavailable')

    await runWorker(ctx)
    const waiting = await ctx.db.generationJob.findUniqueOrThrow({ where: { id } })
    expect((await status(ctx, id, token)).body).toMatchObject({
      status: 'pending',
      attempts: 1,
      error: null,
    })
    expect(waiting.nextAttemptAt.getTime()).toBe(clock.now().getTime() + 1000)

    await runWorker(ctx) // too early: backoff not elapsed
    expect(fake.calls).toHaveLength(1)

    clock.advance(1000)
    await runWorker(ctx)
    expect((await status(ctx, id, token)).body).toMatchObject({ status: 'completed', attempts: 2 })
  })

  it('fails after max attempts; a manual retry can then succeed', async () => {
    const fake = fakeProvider()
    const clock = testClock()
    const ctx = buildTestApp({
      provider: fake.provider,
      clock,
      config: testConfig({ JOB_MAX_ATTEMPTS: '2' }),
    })
    const { id, token } = (await create(ctx)).body
    fake.fail('timeout')
    fake.fail('timeout')

    await runWorker(ctx)
    clock.advance(10_000)
    await runWorker(ctx)
    const failed = (await status(ctx, id, token)).body
    expect(failed).toMatchObject({
      status: 'failed',
      attempts: 2,
      error: { code: 'timeout', retryable: true, message: expect.stringMatching(/too long/) },
      pollAfterMs: null,
    })

    const retried = await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(token, { type: 'bearer' })
    expect(retried.status).toBe(202)
    expect(retried.body).toMatchObject({ status: 'pending', attempts: 0, error: null })

    await runWorker(ctx)
    expect((await status(ctx, id, token)).body.status).toBe('completed')
  })

  it('does not retry permanent failures', async () => {
    const fake = fakeProvider()
    const ctx = buildTestApp({ provider: fake.provider })
    const { id, token } = (await create(ctx)).body
    fake.fail('content-rejected')

    await runWorker(ctx)
    expect((await status(ctx, id, token)).body).toMatchObject({
      status: 'failed',
      attempts: 1,
      error: { code: 'content-rejected', retryable: false },
    })
    const retry = await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(token, { type: 'bearer' })
    expect(retry.status).toBe(409)
    expect(retry.body.error.code).toBe('not-retryable')
  })

  it('limits manual retries', async () => {
    const fake = fakeProvider()
    const ctx = buildTestApp({
      provider: fake.provider,
      config: testConfig({ JOB_MAX_ATTEMPTS: '1', JOB_MAX_MANUAL_RETRIES: '1' }),
    })
    const { id, token } = (await create(ctx)).body
    fake.fail('unavailable')
    fake.fail('unavailable')
    await runWorker(ctx)
    await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(token, { type: 'bearer' })
      .expect(202)
    await runWorker(ctx)

    const after = (await status(ctx, id, token)).body
    expect(after).toMatchObject({ status: 'failed', error: { retryable: false } })
    await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(token, { type: 'bearer' })
      .expect(409)
  })

  it('only allows retrying failed jobs', async () => {
    const ctx = buildTestApp()
    const { id, token } = (await create(ctx)).body
    const res = await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(token, { type: 'bearer' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('not-retryable')
  })

  it('recovers jobs stuck in processing (e.g. after a crash)', async () => {
    const clock = testClock()
    const ctx = buildTestApp({ clock })
    const { id, token } = (await create(ctx)).body
    await ctx.worker.claim() // claimed, then the "process" dies

    clock.advance(ctx.config.JOB_PROCESSING_TIMEOUT_MS + 1)
    expect(await ctx.worker.recoverStale()).toBe(1)
    expect((await status(ctx, id, token)).body.status).toBe('pending')

    await runWorker(ctx)
    expect((await status(ctx, id, token)).body).toMatchObject({ status: 'completed', attempts: 2 })
  })

  it('never processes a job twice, even with competing workers', async () => {
    // Two server instances sharing one database and one bucket.
    const fake = fakeProvider()
    const storage = new MemoryStorage()
    const a = buildTestApp({ provider: fake.provider, storage })
    const b = buildTestApp({ provider: fake.provider, storage })
    await create(a)

    await Promise.all([a.worker.tick(), b.worker.tick(), a.worker.tick(), b.worker.tick()])
    await Promise.all([a.worker.drain(), b.worker.drain()])
    expect(fake.calls).toHaveLength(1)
  })

  it('fails cleanly if the uploaded image disappeared', async () => {
    const storage = new MemoryStorage()
    const ctx = buildTestApp({ storage })
    const { id, token } = (await create(ctx)).body
    storage.objects.clear()
    await runWorker(ctx)
    expect((await status(ctx, id, token)).body).toMatchObject({
      status: 'failed',
      error: { code: 'input-missing', retryable: false },
    })
  })
})

describe('DELETE /api/generations/:id', () => {
  it('deletes the job and all its images', async () => {
    const storage = new MemoryStorage()
    const ctx = buildTestApp({ storage })
    const { id, token } = (await create(ctx)).body
    await runWorker(ctx)
    expect(storage.objects.size).toBe(1) // result only; input already deleted

    await request(ctx.app)
      .delete(`/api/generations/${id}`)
      .auth(token, { type: 'bearer' })
      .expect(204)
    expect(storage.objects.size).toBe(0)
    expect(await ctx.db.generationJob.count()).toBe(0)
    expect((await status(ctx, id, token)).status).toBe(404)
  })

  it('discards the result of a job deleted while processing', async () => {
    const storage = new MemoryStorage()
    const fake = fakeProvider()
    const ctx = buildTestApp({ storage, provider: fake.provider })
    const { id, token } = (await create(ctx)).body
    const release = fake.hold()
    await ctx.worker.tick()

    await request(ctx.app)
      .delete(`/api/generations/${id}`)
      .auth(token, { type: 'bearer' })
      .expect(204)
    release()
    await ctx.worker.drain()
    expect(storage.objects.size).toBe(0)
  })
})

describe('rate limiting and quotas', () => {
  it('limits generations per client per hour', async () => {
    const ctx = buildTestApp({ config: testConfig({ GENERATIONS_PER_HOUR: '2' }) })
    expect((await create(ctx)).status).toBe(202)
    expect((await create(ctx)).status).toBe(202)
    const third = await create(ctx)
    expect(third.status).toBe(429)
    expect(third.body.error.code).toBe('rate-limited')
    expect(third.headers['ratelimit-policy']).toBeDefined()
  })

  it('limits concurrently active jobs per client', async () => {
    const ctx = buildTestApp({ config: testConfig({ MAX_ACTIVE_JOBS_PER_CLIENT: '1' }) })
    expect((await create(ctx)).status).toBe(202)
    const second = await create(ctx)
    expect(second.status).toBe(429)
    expect(second.body.error.code).toBe('too-many-active-jobs')

    await runWorker(ctx)
    expect((await create(ctx)).status).toBe(202)
  })

  it('stops accepting paid jobs once the daily budget is reserved', async () => {
    const { provider } = fakeProvider({ id: 'paid', kind: 'ai', costPerImageUsd: 0.4 })
    const config = {
      ...testConfig(),
      providerTerms: {
        apiKey: 'k',
        styles: ['anime-classic'],
        costPerImageUsd: 0.4,
        retentionDays: 0,
        trainsOnInputs: false as const,
        dailyBudgetUsd: 1,
      },
    }
    const ctx = buildTestApp({ provider, config })
    expect((await create(ctx)).status).toBe(202)
    expect((await create(ctx)).status).toBe(202)
    const third = await create(ctx)
    expect(third.status).toBe(503)
    expect(third.body.error.code).toBe('budget-exceeded')
    expect(await ctx.db.generationJob.count()).toBe(2)
  })
})

describe('HTTP hygiene', () => {
  it('allows only configured browser origins', async () => {
    const ctx = buildTestApp()
    const ok = await request(ctx.app).get('/api/provider').set('Origin', 'https://app.example')
    expect(ok.headers['access-control-allow-origin']).toBe('https://app.example')
    const blocked = await request(ctx.app)
      .get('/api/provider')
      .set('Origin', 'https://evil.example')
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('sends security headers and no-store, and hides the framework', async () => {
    const res = await request(buildTestApp().app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('returns JSON errors for unknown routes', async () => {
    const res = await request(buildTestApp().app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { code: 'not-found', message: 'Not found.' } })
  })

  it('hides internal errors from clients', async () => {
    const ctx = buildTestApp()
    const broken = {
      ...ctx.storage,
      put: async () => {
        throw new Error('s3 credentials invalid: AKIA-SECRET')
      },
    }
    const res = await create(buildTestApp({ storage: broken as unknown as MemoryStorage }))
    expect(res.status).toBe(500)
    expect(res.body).toEqual({
      error: { code: 'internal', message: 'Something went wrong. Try again.' },
    })
    expect(JSON.stringify(res.body)).not.toContain('SECRET')
  })
})
