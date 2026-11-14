import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express, { type Request } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import multer from 'multer'
import { z } from 'zod'
import { ACCOUNT_HEADER, type AccountService } from '../billing/accounts.ts'
import type { PaymentService } from '../billing/payments.ts'
import type { Config } from '../config.ts'
import type { Account, Db } from '../db.ts'
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
  accounts: AccountService
  payments: PaymentService
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
  accounts,
  payments,
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
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Account-Token'],
      maxAge: 600,
    }),
  )
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    // Correlates a user's report with server logs. Accept a sane upstream id, else make one.
    const incoming = req.get('x-request-id')
    const requestId = incoming && /^[\w.-]{8,64}$/.test(incoming) ? incoming : randomUUID()
    res.locals['requestId'] = requestId
    res.set('X-Request-Id', requestId)
    if (config.LOG_REQUESTS) {
      const started = performance.now()
      res.on('finish', () => {
        // Route pattern, not the raw URL: ids and query strings stay out of the logs.
        const route = (req.route as { path?: string } | undefined)?.path
        log.info('request', {
          requestId,
          method: req.method,
          route: route
            ? `${req.baseUrl}${route}`
            : req.path.startsWith('/api/')
              ? '(unmatched)'
              : req.path,
          status: res.statusCode,
          ms: Math.round(performance.now() - started),
        })
      })
    }
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
      // Razorpay webhooks come from Razorpay's servers, not end users.
      skip: (req) => req.path === '/billing/webhook',
      handler: limitHandler('rate-limited', 'Too many requests. Slow down a little.'),
    }),
  )
  const accountLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: config.ACCOUNTS_PER_HOUR,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: clientOf,
    handler: limitHandler('rate-limited', 'Too many new sessions. Try again later.'),
  })
  const orderLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: config.ORDERS_PER_HOUR,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: clientOf,
    handler: limitHandler('rate-limited', 'Too many purchase attempts. Try again later.'),
  })
  const json = express.json({ limit: '10kb' })

  /** Resolves the caller's account from X-Account-Token (401 if missing or unknown). */
  const account = (req: Request): Promise<Account> => accounts.authenticate(req.get(ACCOUNT_HEADER))
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

  // --- Accounts ---------------------------------------------------------------------------

  app.post('/api/accounts', accountLimiter, async (req, res) => {
    const { account: created, token } = await accounts.create(clientOf(req))
    res.status(201).json({ token, account: await accounts.view(created, clientOf(req)) })
  })

  app.get('/api/account', async (req, res) => {
    res.json(await accounts.view(await account(req), clientOf(req)))
  })

  // --- Billing ----------------------------------------------------------------------------

  app.get('/api/billing/packs', (_req, res) => {
    res.json(payments.packs())
  })

  app.post('/api/billing/orders', orderLimiter, json, async (req, res) => {
    const owner = await account(req)
    res
      .status(201)
      .json(await payments.createOrder(owner, (req.body as { packId?: unknown })?.packId))
  })

  app.get('/api/billing/orders/:id', async (req, res) => {
    const order = await payments.getOrder(await account(req), req.params.id)
    res.json(payments.view(order))
  })

  app.post('/api/billing/orders/:id/verify', json, async (req, res) => {
    const owner = await account(req)
    const result = await payments.verify(
      owner,
      req.params.id,
      (req.body ?? {}) as Record<string, unknown>,
    )
    res.json({ ...result, account: await accounts.view(owner, clientOf(req)) })
  })

  // Raw body: the signature is computed over the exact bytes Razorpay sent.
  app.post('/api/billing/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    const result = await payments.handleWebhook(
      raw,
      req.get('x-razorpay-signature'),
      req.get('x-razorpay-event-id'),
    )
    res.json(result)
  })

  // --- Generations ------------------------------------------------------------------------

  app.post('/api/generations', createLimiter, upload.single('image'), async (req, res) => {
    const owner = await account(req)
    const body = CreateBody.safeParse(req.body)
    if (!body.success)
      throw new ApiError(422, 'unknown-style', 'Choose one of the available styles.')
    if (!req.file) throw new UploadError('missing-image', 'Attach an image in the "image" field.')

    const image = await validateAndNormalize(req.file.buffer)
    const { job, token } = await service.create({
      styleId: body.data.styleId,
      image,
      clientHash: clientOf(req),
      account: owner,
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
