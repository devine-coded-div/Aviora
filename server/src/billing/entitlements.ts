import { randomUUID } from 'node:crypto'
import type { Config } from '../config.ts'
import {
  ChargeState,
  ChargeType,
  JobStatus,
  LedgerReason,
  type Account,
  type Db,
  type Tx,
} from '../db.ts'
import { ApiError } from '../http/errors.ts'
import { PREMIUM_STYLE_IDS } from '../styles.ts'
import { CREDITS_PER_GENERATION } from './packs.ts'

const DAY_MS = 24 * 3_600_000

/**
 * Serialize all charging for one client network and one account. Without this, two parallel
 * requests could both see "2 of 3 free used" and both take the last free generation.
 */
export async function lockForCharging(tx: Tx, accountId: string, clientHash: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${clientHash}))`
  await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${accountId}::uuid FOR UPDATE`
}

export interface FreeQuota {
  limit: number
  used: number
  remaining: number
  /** When the oldest counted use expires (rolling 24 h), or null if nothing is used. */
  resetsAt: Date | null
}

/** Free uses in the last 24 h, counted per account and per client IP; the stricter one wins. */
export async function freeQuota(
  db: Db | Tx,
  accountId: string,
  clientHash: string,
  limit: number,
  now: Date,
) {
  const since = new Date(now.getTime() - DAY_MS)
  const [byAccount, byClient] = await Promise.all([
    db.freeUsage.findMany({
      where: { accountId, refunded: false, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.freeUsage.findMany({
      where: { clientHash, refunded: false, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  const counted = byAccount.length >= byClient.length ? byAccount : byClient
  const used = counted.length
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: counted[0] ? new Date(counted[0].createdAt.getTime() + DAY_MS) : null,
  } satisfies FreeQuota
}

/**
 * Pay for one generation attempt cycle, inside the caller's transaction (after lockForCharging).
 * Free styles use the free quota first; premium styles, and free styles once the quota is used,
 * cost a credit. Throws 402 if neither is available. Idempotent per (job, cycle).
 */
export async function chargeGeneration(
  tx: Tx,
  args: {
    account: Account
    clientHash: string
    jobId: string
    cycle: number
    styleId: string
    config: Config
    now: Date
  },
): Promise<ChargeType> {
  const { account, clientHash, jobId, cycle, styleId, config, now } = args
  const premium = PREMIUM_STYLE_IDS.has(styleId)

  if (!premium) {
    const quota = await freeQuota(tx, account.id, clientHash, config.FREE_GENERATIONS_PER_DAY, now)
    if (quota.remaining > 0) {
      await tx.freeUsage.create({
        data: { id: randomUUID(), accountId: account.id, clientHash, jobId, cycle, createdAt: now },
      })
      return ChargeType.FREE
    }
  }

  const { count } = await tx.account.updateMany({
    where: { id: account.id, credits: { gte: CREDITS_PER_GENERATION } },
    data: { credits: { decrement: CREDITS_PER_GENERATION } },
  })
  if (count === 0) {
    throw new ApiError(
      402,
      'payment-required',
      premium
        ? 'This is a Premium style. Get credits to use it.'
        : 'You’ve used today’s free generations. Get credits to keep going.',
    )
  }
  const { credits } = await tx.account.findUniqueOrThrow({
    where: { id: account.id },
    select: { credits: true },
  })
  await tx.creditLedger.create({
    data: {
      id: randomUUID(),
      accountId: account.id,
      delta: -CREDITS_PER_GENERATION,
      reason: LedgerReason.GENERATION,
      idempotencyKey: `charge:${jobId}:${cycle}`,
      jobId,
      balanceAfter: credits,
    },
  })
  return ChargeType.CREDIT
}

/**
 * Give back what a job's current cycle cost (credit or free use) when it ends without a result
 * (failed, or deleted before completing). Safe to call any number of times: only the call that
 * flips chargeState CHARGED → REFUNDED refunds, and the ledger key is unique per (job, cycle).
 */
export async function refundJob(db: Db, jobId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const job = await tx.generationJob.findUnique({ where: { id: jobId } })
    if (!job || job.chargeState !== ChargeState.CHARGED || job.status === JobStatus.COMPLETED)
      return false

    const { count } = await tx.generationJob.updateMany({
      where: {
        id: jobId,
        chargeState: ChargeState.CHARGED,
        chargeCycle: job.chargeCycle,
        status: { not: JobStatus.COMPLETED },
      },
      data: { chargeState: ChargeState.REFUNDED },
    })
    if (count === 0) return false

    if (job.chargeType === ChargeType.FREE) {
      await tx.freeUsage.updateMany({
        where: { jobId, cycle: job.chargeCycle },
        data: { refunded: true },
      })
    } else if (job.chargeType === ChargeType.CREDIT && job.accountId) {
      const account = await tx.account.update({
        where: { id: job.accountId },
        data: { credits: { increment: CREDITS_PER_GENERATION } },
      })
      await tx.creditLedger.create({
        data: {
          id: randomUUID(),
          accountId: job.accountId,
          delta: CREDITS_PER_GENERATION,
          reason: LedgerReason.REFUND,
          idempotencyKey: `refund:${jobId}:${job.chargeCycle}`,
          jobId,
          balanceAfter: account.credits,
        },
      })
    }
    return true
  })
}

/** Refund every failed job that's still charged (e.g. failed by stale-job recovery). */
export async function settleRefunds(db: Db): Promise<number> {
  const jobs = await db.generationJob.findMany({
    where: { status: JobStatus.FAILED, chargeState: ChargeState.CHARGED },
    select: { id: true },
  })
  let refunded = 0
  for (const job of jobs) if (await refundJob(db, job.id)) refunded++
  return refunded
}
