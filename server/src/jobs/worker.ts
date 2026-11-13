import type { Config } from '../config.ts'
import { JobStatus, type Db, type GenerationJob } from '../db.ts'
import type { AvatarProvider } from '../providers/types.ts'
import type { ObjectStorage } from '../storage/types.ts'
import { JOB_ERROR_MESSAGES, toProviderError } from './errors.ts'

export interface WorkerDeps {
  db: Db
  storage: ObjectStorage
  provider: AvatarProvider
  config: Config
  now?: () => Date
  log?: Pick<Console, 'info' | 'warn' | 'error'>
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
export const resultKey = (id: string, mime: string) => `results/${id}.${EXT[mime] ?? 'bin'}`

/**
 * In-process job runner. Jobs are claimed with `FOR UPDATE SKIP LOCKED`, so several server
 * instances can share one database without processing a job twice.
 *
 * Lifecycle: PENDING → PROCESSING → COMPLETED | FAILED. Retryable provider errors go back to
 * PENDING with exponential backoff until maxAttempts; jobs stuck in PROCESSING past the timeout
 * (e.g. after a crash) are recovered.
 */
export class JobWorker {
  private readonly deps: Required<Omit<WorkerDeps, 'log'>> & { log: WorkerDeps['log'] }
  private readonly inFlight = new Set<Promise<void>>()
  private readonly controllers = new Set<AbortController>()
  private timer: NodeJS.Timeout | null = null
  private ticking = false
  private stopped = false

  constructor(deps: WorkerDeps) {
    this.deps = { now: () => new Date(), log: console, ...deps }
  }

  start(): void {
    this.stopped = false
    this.timer = setInterval(() => this.kick(), this.deps.config.WORKER_POLL_MS)
    this.timer.unref()
    this.kick()
  }

  /** Look for work now (e.g. right after a job is created). */
  kick(): void {
    if (this.stopped) return
    void this.tick().catch((error: unknown) => this.deps.log?.error('worker tick failed', error))
  }

  /** Stop claiming jobs, wait for in-flight work, abort it after `graceMs`. */
  async stop(graceMs = 10_000): Promise<void> {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    const all = Promise.allSettled([...this.inFlight])
    const timeout = new Promise((r) => setTimeout(r, graceMs).unref())
    await Promise.race([all, timeout])
    for (const c of this.controllers) c.abort()
    await all
  }

  /** Recover stale jobs, then claim and start jobs up to the concurrency limit. */
  async tick(): Promise<void> {
    if (this.ticking) return
    this.ticking = true
    try {
      await this.recoverStale()
      while (!this.stopped && this.inFlight.size < this.deps.config.WORKER_CONCURRENCY) {
        const job = await this.claim()
        if (!job) break
        const run = this.process(job).finally(() => this.inFlight.delete(run))
        this.inFlight.add(run)
      }
    } finally {
      this.ticking = false
    }
  }

  /** Wait until no job is running (tests). */
  async drain(): Promise<void> {
    while (this.inFlight.size > 0) await Promise.allSettled([...this.inFlight])
  }

  async claim(): Promise<GenerationJob | null> {
    const now = this.deps.now()
    const rows = await this.deps.db.$queryRaw<{ id: string }[]>`
      UPDATE "GenerationJob"
      SET "status" = 'PROCESSING', "lockedAt" = ${now}, "attempts" = "attempts" + 1, "updatedAt" = ${now}
      WHERE "id" = (
        SELECT "id" FROM "GenerationJob"
        WHERE "status" = 'PENDING' AND "nextAttemptAt" <= ${now}
        ORDER BY "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id"`
    const id = rows[0]?.id
    return id ? this.deps.db.generationJob.findUnique({ where: { id } }) : null
  }

  async process(job: GenerationJob): Promise<void> {
    const { db, storage, provider, config, now, log } = this.deps
    const lockedAt = job.lockedAt
    const stillOurs = { id: job.id, status: JobStatus.PROCESSING, lockedAt }

    const input = job.inputKey ? await storage.get(job.inputKey) : null
    if (!input) {
      await db.generationJob.updateMany({
        where: stillOurs,
        data: {
          status: JobStatus.FAILED,
          failedAt: now(),
          lockedAt: null,
          retryable: false,
          errorCode: 'input-missing',
          errorMessage: JOB_ERROR_MESSAGES['input-missing'],
        },
      })
      return
    }

    const controller = new AbortController()
    this.controllers.add(controller)
    const timeout = setTimeout(() => controller.abort(), config.AI_PROVIDER_TIMEOUT_MS)
    try {
      const output = await provider.generate({
        image: input.body,
        mime: input.contentType,
        styleId: job.styleId,
        signal: controller.signal,
      })
      const key = resultKey(job.id, output.mime)
      await storage.put(key, output.image, output.mime)
      const finishedAt = now()
      const { count } = await db.generationJob.updateMany({
        where: stillOurs,
        data: {
          status: JobStatus.COMPLETED,
          resultKey: key,
          resultMime: output.mime,
          completedAt: finishedAt,
          resultExpiresAt: new Date(finishedAt.getTime() + config.RESULT_TTL_HOURS * 3_600_000),
          lockedAt: null,
          errorCode: null,
          errorMessage: null,
          retryable: false,
        },
      })
      if (count === 0) {
        // Deleted or reclaimed while we worked: don't leave an orphaned result behind.
        await storage.delete(key)
        return
      }
      // The input is no longer needed once a result exists.
      if (job.inputKey) await this.deleteInput(job.id, job.inputKey)
    } catch (error) {
      const err = toProviderError(error)
      log?.warn(
        `job ${job.id} attempt ${job.attempts} failed: ${err.kind}`,
        err.cause ?? err.message,
      )
      const retryLater = err.retryable && job.attempts < job.maxAttempts
      const backoff = config.JOB_RETRY_BASE_MS * 2 ** Math.max(0, job.attempts - 1)
      await db.generationJob.updateMany({
        where: stillOurs,
        data: retryLater
          ? {
              status: JobStatus.PENDING,
              nextAttemptAt: new Date(now().getTime() + backoff),
              lockedAt: null,
              errorCode: err.kind,
              errorMessage: JOB_ERROR_MESSAGES[err.kind],
            }
          : {
              status: JobStatus.FAILED,
              failedAt: now(),
              lockedAt: null,
              retryable: err.retryable,
              errorCode: err.kind,
              errorMessage: JOB_ERROR_MESSAGES[err.kind],
            },
      })
      if (retryLater && backoff === 0) this.kick()
    } finally {
      clearTimeout(timeout)
      this.controllers.delete(controller)
    }
  }

  private async deleteInput(id: string, key: string) {
    try {
      await this.deps.storage.delete(key)
      await this.deps.db.generationJob.updateMany({
        where: { id, inputKey: key },
        data: { inputKey: null },
      })
    } catch (error) {
      // Left in place; the cleanup sweeper retries completed jobs that still have an input.
      this.deps.log?.warn(`could not delete input for job ${id}`, error)
    }
  }

  /** Jobs left PROCESSING past the timeout (crash, lost worker) are retried or failed. */
  async recoverStale(): Promise<number> {
    const { db, config, now } = this.deps
    const cutoff = new Date(now().getTime() - config.JOB_PROCESSING_TIMEOUT_MS)
    const [retry, fail] = await db.$transaction([
      db.$executeRaw`
        UPDATE "GenerationJob" SET "status" = 'PENDING', "lockedAt" = NULL,
          "nextAttemptAt" = ${now()}, "errorCode" = 'timeout', "updatedAt" = ${now()}
        WHERE "status" = 'PROCESSING' AND "lockedAt" < ${cutoff} AND "attempts" < "maxAttempts"`,
      db.$executeRaw`
        UPDATE "GenerationJob" SET "status" = 'FAILED', "lockedAt" = NULL, "failedAt" = ${now()},
          "retryable" = true, "errorCode" = 'timeout', "errorMessage" = ${JOB_ERROR_MESSAGES.timeout},
          "updatedAt" = ${now()}
        WHERE "status" = 'PROCESSING' AND "lockedAt" < ${cutoff} AND "attempts" >= "maxAttempts"`,
    ])
    return retry + fail
  }
}
