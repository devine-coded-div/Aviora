import { randomUUID } from 'node:crypto'
import type { Config } from '../config.ts'
import { JobStatus, type Db, type GenerationJob } from '../db.ts'
import { ApiError } from '../http/errors.ts'
import type { AvatarProvider } from '../providers/types.ts'
import type { ObjectStorage } from '../storage/types.ts'
import type { NormalizedImage } from '../uploads/validateImage.ts'
import { hashToken, newToken, tokenMatches } from './tokens.ts'

export interface JobServiceDeps {
  db: Db
  storage: ObjectStorage
  provider: AvatarProvider
  config: Config
  now?: () => Date
}

const ACTIVE = [JobStatus.PENDING, JobStatus.PROCESSING]
const DAY_MS = 24 * 60 * 60 * 1000

export const inputKey = (id: string) => `inputs/${id}.png`

/** Creating, reading, retrying and deleting jobs on behalf of API clients. */
export class JobService {
  private readonly db: Db
  private readonly storage: ObjectStorage
  private readonly provider: AvatarProvider
  private readonly config: Config
  private readonly now: () => Date

  constructor(deps: JobServiceDeps) {
    this.db = deps.db
    this.storage = deps.storage
    this.provider = deps.provider
    this.config = deps.config
    this.now = deps.now ?? (() => new Date())
  }

  async create(args: { styleId: string; image: NormalizedImage; clientHash: string }) {
    const { styleId, image, clientHash } = args
    if (!this.provider.info.styles.includes(styleId)) {
      throw new ApiError(422, 'style-unavailable', 'This style isn’t available right now.')
    }

    const active = await this.db.generationJob.count({
      where: { clientHash, status: { in: ACTIVE } },
    })
    if (active >= this.config.MAX_ACTIVE_JOBS_PER_CLIENT) {
      throw new ApiError(429, 'too-many-active-jobs', 'Wait for your current generation to finish.')
    }

    const costMicros = Math.round(this.provider.info.costPerImageUsd * 1_000_000)
    const budget = this.config.providerTerms?.dailyBudgetUsd
    if (costMicros > 0 && budget !== undefined) {
      const since = new Date(this.now().getTime() - DAY_MS)
      const spent = await this.db.generationJob.aggregate({
        _sum: { costMicros: true },
        where: { createdAt: { gte: since } },
      })
      if ((spent._sum.costMicros ?? 0) + costMicros > budget * 1_000_000) {
        throw new ApiError(
          503,
          'budget-exceeded',
          'Generation is paused for today. Try again later.',
        )
      }
    }

    const id = randomUUID()
    const token = newToken()
    const key = inputKey(id)
    await this.storage.put(key, image.body, image.mime)
    try {
      const job = await this.db.generationJob.create({
        data: {
          id,
          tokenHash: hashToken(token),
          clientHash,
          styleId,
          providerId: this.provider.info.id,
          inputKey: key,
          maxAttempts: this.config.JOB_MAX_ATTEMPTS,
          costMicros,
          nextAttemptAt: this.now(),
        },
      })
      return { job, token }
    } catch (error) {
      await this.storage.delete(key).catch(() => {})
      throw error
    }
  }

  /** Returns the job only for the holder of its token. Unknown id and wrong token look the same. */
  async authorize(id: string, token: string | null): Promise<GenerationJob> {
    if (!token || !isUuid(id)) throw notFound()
    const job = await this.db.generationJob.findUnique({ where: { id } })
    if (!job || !tokenMatches(token, job.tokenHash)) throw notFound()
    return job
  }

  async retry(job: GenerationJob): Promise<GenerationJob> {
    const allowed =
      job.status === JobStatus.FAILED &&
      job.retryable &&
      job.inputKey !== null &&
      job.manualRetries < this.config.JOB_MAX_MANUAL_RETRIES
    if (!allowed) {
      throw new ApiError(409, 'not-retryable', 'This generation can’t be retried. Start a new one.')
    }
    // Guard on status so two concurrent retries can't both succeed.
    const { count } = await this.db.generationJob.updateMany({
      where: { id: job.id, status: JobStatus.FAILED, manualRetries: job.manualRetries },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        manualRetries: { increment: 1 },
        nextAttemptAt: this.now(),
        errorCode: null,
        errorMessage: null,
        retryable: false,
        failedAt: null,
      },
    })
    if (count === 0) throw new ApiError(409, 'not-retryable', 'This generation can’t be retried.')
    return this.db.generationJob.findUniqueOrThrow({ where: { id: job.id } })
  }

  /** Delete the job and every stored image. Safe while processing: the worker discards its result. */
  async remove(job: GenerationJob): Promise<void> {
    await this.db.generationJob.deleteMany({ where: { id: job.id } })
    await Promise.all(
      [job.inputKey, job.resultKey]
        .filter((k): k is string => !!k)
        .map((k) => this.storage.delete(k)),
    )
  }

  async readResult(job: GenerationJob) {
    if (job.status !== JobStatus.COMPLETED || !job.resultKey) {
      throw new ApiError(409, 'not-ready', 'The result isn’t ready yet.')
    }
    const object = await this.storage.get(job.resultKey)
    if (!object) throw notFound()
    return object
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isUuid = (value: string) => UUID.test(value)
const notFound = () => new ApiError(404, 'not-found', 'Generation not found.')
