import cors from 'cors'
import express, { type Request } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import multer from 'multer'
import { z } from 'zod'
import type { Config } from '../config.ts'
import type { Db } from '../db.ts'
import { JobService } from '../jobs/service.ts'
import { hashClient } from '../jobs/tokens.ts'
import type { JobWorker } from '../jobs/worker.ts'
import type { AvatarProvider } from '../providers/types.ts'
import { isStyleId } from '../styles.ts'
import { UploadError, validateAndNormalize } from '../uploads/validateImage.ts'
import { ApiError, errorHandler, notFoundHandler } from './errors.ts'
import { serializeJob, serializeProvider } from './serialize.ts'

export interface AppDeps {
  config: Config
  db: Db
  provider: AvatarProvider
  service: JobService
  worker: Pick<JobWorker, 'kick'>
  /** Secret for hashing client IPs. */
  clientSecret: string
  log?: Pick<Console, 'info' | 'warn' | 'error'>
}

const POLL_AFTER_MS = 1000
const CreateBody = z.object({ styleId: z.string().refine(isStyleId, 'Unknown style') })

function bearer(req: Request): string | null {
  const header = req.get('authorization') ?? ''
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,100})$/.exec(header)
  return match?.[1] ?? null
}

export function createApp({
  config,
  db,
  provider,
  service,
  worker,
  clientSecret,
  log = console,
}: AppDeps) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.TRUST_PROXY)

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.CORS_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  )
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // IPv6 clients are keyed by their /56 subnet so rotating addresses can't dodge limits.
  const clientOf = (req: Request) =>
    hashClient(ipKeyGenerator(req.ip ?? 'unknown', 56), clientSecret)
  const limitHandler =
    (code: string, message: string) => (_req: Request, res: express.Response) => {
      res.status(429).json({ error: { code, message } })
    }

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: config.API_REQUESTS_PER_MINUTE,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: clientOf,
      handler: limitHandler('rate-limited', 'Too many requests. Slow down a little.'),
    }),
  )
  const createLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: config.GENERATIONS_PER_HOUR,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: clientOf,
    handler: limitHandler('rate-limited', 'You’ve reached the hourly limit. Try again later.'),
  })

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1, fields: 4, fieldSize: 1024, parts: 6 },
  })

  app.get('/api/health', async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`
      res.json({ status: 'ok' })
    } catch {
      res.status(503).json({ status: 'unavailable' })
    }
  })

  app.get('/api/provider', (_req, res) => {
    res.json(serializeProvider(provider.info, config.RESULT_TTL_HOURS))
  })

  app.post('/api/generations', createLimiter, upload.single('image'), async (req, res) => {
    const body = CreateBody.safeParse(req.body)
    if (!body.success)
      throw new ApiError(422, 'unknown-style', 'Choose one of the available styles.')
    if (!req.file) throw new UploadError('missing-image', 'Attach an image in the "image" field.')

    const image = await validateAndNormalize(req.file.buffer)
    const { job, token } = await service.create({
      styleId: body.data.styleId,
      image,
      clientHash: clientOf(req),
    })
    worker.kick()
    res
      .status(202)
      .location(`/api/generations/${job.id}`)
      .json({
        ...serializeJob(job, {
          pollAfterMs: POLL_AFTER_MS,
          maxManualRetries: config.JOB_MAX_MANUAL_RETRIES,
        }),
        token,
      })
  })

  app.get('/api/generations/:id', async (req, res) => {
    const job = await service.authorize(req.params.id, bearer(req))
    res.json(
      serializeJob(job, {
        pollAfterMs: POLL_AFTER_MS,
        maxManualRetries: config.JOB_MAX_MANUAL_RETRIES,
      }),
    )
  })

  app.get('/api/generations/:id/result', async (req, res) => {
    const job = await service.authorize(req.params.id, bearer(req))
    const object = await service.readResult(job)
    res.set('Content-Type', object.contentType)
    res.set('Content-Disposition', 'inline')
    res.set('Cache-Control', 'private, no-store')
    res.send(object.body)
  })

  app.post('/api/generations/:id/retry', async (req, res) => {
    const job = await service.authorize(req.params.id, bearer(req))
    const updated = await service.retry(job)
    worker.kick()
    res.status(202).json(
      serializeJob(updated, {
        pollAfterMs: POLL_AFTER_MS,
        maxManualRetries: config.JOB_MAX_MANUAL_RETRIES,
      }),
    )
  })

  app.delete('/api/generations/:id', async (req, res) => {
    const job = await service.authorize(req.params.id, bearer(req))
    await service.remove(job)
    res.status(204).end()
  })

  app.use(notFoundHandler)
  app.use(errorHandler(log))
  return app
}
