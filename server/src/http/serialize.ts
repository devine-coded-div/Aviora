import { JobStatus, type GenerationJob } from '../db.ts'
import type { ProviderInfo } from '../providers/types.ts'

const STATUS = {
  [JobStatus.PENDING]: 'pending',
  [JobStatus.PROCESSING]: 'processing',
  [JobStatus.COMPLETED]: 'completed',
  [JobStatus.FAILED]: 'failed',
} as const

/** Public view of a job. Never includes token hashes, client hashes or storage keys. */
export function serializeJob(
  job: GenerationJob,
  opts: { pollAfterMs: number; maxManualRetries: number },
) {
  const done = job.status === JobStatus.COMPLETED && job.resultKey !== null
  const failed = job.status === JobStatus.FAILED
  return {
    id: job.id,
    status: STATUS[job.status],
    styleId: job.styleId,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    error:
      failed && job.errorCode
        ? {
            code: job.errorCode,
            message: job.errorMessage ?? 'Generation failed.',
            retryable:
              job.retryable && job.inputKey !== null && job.manualRetries < opts.maxManualRetries,
          }
        : null,
    result: done
      ? {
          url: `/api/generations/${job.id}/result`,
          mime: job.resultMime,
          expiresAt: job.resultExpiresAt?.toISOString() ?? null,
        }
      : null,
    pollAfterMs: done || failed ? null : opts.pollAfterMs,
    charge: job.chargeType
      ? {
          type: job.chargeType === 'FREE' ? 'free' : 'credit',
          refunded: job.chargeState === 'REFUNDED',
        }
      : null,
  }
}

/** What clients may know about the provider (no keys, no internal config). */
export function serializeProvider(info: ProviderInfo, resultTtlHours: number) {
  return {
    id: info.id,
    name: info.name,
    kind: info.kind,
    styles: info.styles,
    privacy: {
      trainsOnInputs: info.trainsOnInputs,
      providerRetentionDays: info.retentionDays,
      uploadsDeleted: 'after processing',
      resultsDeletedAfterHours: resultTtlHours,
    },
  }
}
