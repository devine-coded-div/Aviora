import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { sweep } from '../src/jobs/cleanup.ts'
import { MemoryStorage } from '../src/storage/memory.ts'
import { buildTestApp, fakeProvider, jpeg, resetDb, testClock, testConfig } from './helpers.ts'

beforeEach(resetDb)

async function createJob(ctx: ReturnType<typeof buildTestApp>) {
  const res = await request(ctx.app)
    .post('/api/generations')
    .field('styleId', 'anime-classic')
    .attach('image', await jpeg(), 'me.jpg')
  return res.body as { id: string; token: string }
}

describe('cleanup of temporary images', () => {
  it('deletes completed results (object and row) after the result TTL', async () => {
    const storage = new MemoryStorage()
    const clock = testClock()
    const ctx = buildTestApp({ storage, clock })
    const { id } = await createJob(ctx)
    await ctx.worker.tick()
    await ctx.worker.drain()

    clock.advance(23 * 3_600_000)
    expect(await sweep({ ...ctx, now: clock.now })).toEqual({ inputsDeleted: 0, jobsDeleted: 0 })
    expect(storage.objects.size).toBe(1)

    clock.advance(2 * 3_600_000)
    expect(await sweep({ ...ctx, now: clock.now })).toEqual({ inputsDeleted: 0, jobsDeleted: 1 })
    expect(storage.objects.size).toBe(0)
    expect(await ctx.db.generationJob.findUnique({ where: { id } })).toBeNull()
  })

  it('keeps a failed job’s input briefly for retry, then deletes it', async () => {
    const storage = new MemoryStorage()
    const clock = testClock()
    const fake = fakeProvider()
    const ctx = buildTestApp({
      storage,
      clock,
      provider: fake.provider,
      config: testConfig({ JOB_MAX_ATTEMPTS: '1' }),
    })
    const { id, token } = await createJob(ctx)
    fake.fail('unavailable')
    await ctx.worker.tick()
    await ctx.worker.drain()

    clock.advance(30 * 60_000)
    await sweep({ ...ctx, now: clock.now })
    expect(storage.objects.has(`inputs/${id}.png`)).toBe(true)

    clock.advance(31 * 60_000)
    expect((await sweep({ ...ctx, now: clock.now })).inputsDeleted).toBe(1)
    expect(storage.objects.size).toBe(0)
    const res = await request(ctx.app).get(`/api/generations/${id}`).auth(token, { type: 'bearer' })
    expect(res.body.error.retryable).toBe(false)
    await request(ctx.app)
      .post(`/api/generations/${id}/retry`)
      .auth(token, { type: 'bearer' })
      .expect(409)
  })

  it('removes inputs left behind if the worker could not delete them', async () => {
    const storage = new MemoryStorage()
    const ctx = buildTestApp({ storage })
    const { id } = await createJob(ctx)
    // Simulate: completed, but input deletion failed.
    await ctx.db.generationJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        resultKey: `results/${id}.png`,
        resultExpiresAt: new Date(Date.now() + 3_600_000),
      },
    })
    expect((await sweep(ctx)).inputsDeleted).toBe(1)
    expect(storage.objects.has(`inputs/${id}.png`)).toBe(false)
  })

  it('deletes abandoned jobs after a day', async () => {
    const storage = new MemoryStorage()
    const clock = testClock(new Date())
    const ctx = buildTestApp({ storage, clock })
    await createJob(ctx)
    clock.advance(25 * 3_600_000)
    expect((await sweep({ ...ctx, now: clock.now })).jobsDeleted).toBe(1)
    expect(storage.objects.size).toBe(0)
  })
})
