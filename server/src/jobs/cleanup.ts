import type { Config } from '../config.ts'
import { JobStatus, type Db } from '../db.ts'
import type { ObjectStorage } from '../storage/types.ts'

export interface CleanupDeps {
  db: Db
  storage: ObjectStorage
  config: Config
  now?: () => Date
}

export interface CleanupReport {
  inputsDeleted: number
  jobsDeleted: number
}

const ABANDONED_MS = 24 * 3_600_000

/**
 * Deletes temporary images and expired jobs. Objects are deleted before the database reference
 * is cleared, so a crash mid-way leaves something the next sweep can still find.
 *
 * - Completed jobs: input deleted (normally already done by the worker).
 * - Failed jobs: input kept FAILED_INPUT_TTL_MINUTES for a manual retry, then deleted.
 * - Completed jobs past their expiry, failed jobs past RESULT_TTL_HOURS, and jobs stuck for a
 *   day: every object and the row are deleted.
 */
export async function sweep({
  db,
  storage,
  config,
  now = () => new Date(),
}: CleanupDeps): Promise<CleanupReport> {
  const t = now().getTime()
  const report: CleanupReport = { inputsDeleted: 0, jobsDeleted: 0 }

  const staleInputs = await db.generationJob.findMany({
    where: {
      inputKey: { not: null },
      OR: [
        { status: JobStatus.COMPLETED },
        {
          status: JobStatus.FAILED,
          failedAt: { lt: new Date(t - config.FAILED_INPUT_TTL_MINUTES * 60_000) },
        },
      ],
    },
    select: { id: true, inputKey: true },
  })
  for (const job of staleInputs) {
    await storage.delete(job.inputKey!)
    await db.generationJob.updateMany({
      where: { id: job.id, inputKey: job.inputKey },
      data: { inputKey: null, retryable: false },
    })
    report.inputsDeleted++
  }

  const expired = await db.generationJob.findMany({
    where: {
      OR: [
        { status: JobStatus.COMPLETED, resultExpiresAt: { lt: new Date(t) } },
        {
          status: JobStatus.FAILED,
          failedAt: { lt: new Date(t - config.RESULT_TTL_HOURS * 3_600_000) },
        },
        {
          status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
          createdAt: { lt: new Date(t - ABANDONED_MS) },
        },
      ],
    },
    select: { id: true, inputKey: true, resultKey: true },
  })
  for (const job of expired) {
    for (const key of [job.inputKey, job.resultKey]) if (key) await storage.delete(key)
    await db.generationJob.deleteMany({ where: { id: job.id } })
    report.jobsDeleted++
  }
  return report
}
