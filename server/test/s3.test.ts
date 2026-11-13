import request from 'supertest'
import sharp from 'sharp'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, jpeg, resetDb, s3Storage } from './helpers.ts'

beforeEach(resetDb)

describe('S3 storage (against an S3 API emulator)', () => {
  it('writes, reads and deletes private objects under the key prefix', async () => {
    const s3 = s3Storage('prefix-test/')
    await s3.put('inputs/x.png', Buffer.from('data'), 'image/png')
    const got = await s3.get('inputs/x.png')
    expect(got?.body.toString()).toBe('data')
    expect(got?.contentType).toBe('image/png')
    expect(await s3Storage('other-prefix/').get('inputs/x.png')).toBeNull()

    await s3.delete('inputs/x.png')
    expect(await s3.get('inputs/x.png')).toBeNull()
    await expect(s3.delete('inputs/x.png')).resolves.toBeUndefined()
  })

  it('runs a whole generation through S3', async () => {
    const storage = s3Storage()
    const ctx = buildTestApp({ storage })
    const created = await request(ctx.app)
      .post('/api/generations')
      .field('styleId', 'pixel-8bit')
      .attach('image', await jpeg(), 'me.jpg')
    const { id, token } = created.body
    expect(await storage.get(`inputs/${id}.png`)).not.toBeNull()

    await ctx.worker.tick()
    await ctx.worker.drain()

    const result = await request(ctx.app)
      .get(`/api/generations/${id}/result`)
      .auth(token, { type: 'bearer' })
    expect(result.status).toBe(200)
    expect((await sharp(result.body).metadata()).format).toBe('png')
    expect(await storage.get(`inputs/${id}.png`)).toBeNull()
    expect(await storage.get(`results/${id}.png`)).not.toBeNull()

    await request(ctx.app)
      .delete(`/api/generations/${id}`)
      .auth(token, { type: 'bearer' })
      .expect(204)
    expect(await storage.get(`results/${id}.png`)).toBeNull()
  })
})
