import { randomUUID } from 'node:crypto'
import type { Config } from '../config.ts'
import type { Account, Db } from '../db.ts'
import { ApiError } from '../http/errors.ts'
import { hashToken, newToken } from '../jobs/tokens.ts'
import { PREMIUM_STYLE_IDS } from '../styles.ts'
import { freeQuota } from './entitlements.ts'
import { CREDITS_PER_GENERATION } from './packs.ts'

export const ACCOUNT_HEADER = 'x-account-token'

/** Anonymous accounts: no sign-up; the token is the credential (only its hash is stored). */
export class AccountService {
  private readonly db: Db
  private readonly config: Config
  private readonly now: () => Date

  constructor(deps: { db: Db; config: Config; now?: () => Date }) {
    this.db = deps.db
    this.config = deps.config
    this.now = deps.now ?? (() => new Date())
  }

  async create(clientHash: string) {
    const token = newToken()
    const account = await this.db.account.create({
      data: { id: randomUUID(), tokenHash: hashToken(token), clientHash },
    })
    return { account, token }
  }

  async authenticate(token: string | undefined): Promise<Account> {
    if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
      throw new ApiError(
        401,
        'account-required',
        'Your session is missing. Reload the page and try again.',
      )
    }
    const account = await this.db.account.findUnique({ where: { tokenHash: hashToken(token) } })
    if (!account)
      throw new ApiError(401, 'account-required', 'Your session is invalid. Reload the page.')
    return account
  }

  /** What the client may show. Entitlements are always recomputed here, never trusted from clients. */
  async view(account: Account, clientHash: string) {
    const quota = await freeQuota(
      this.db,
      account.id,
      clientHash,
      this.config.FREE_GENERATIONS_PER_DAY,
      this.now(),
    )
    const fresh = await this.db.account.findUniqueOrThrow({
      where: { id: account.id },
      select: { credits: true },
    })
    return {
      credits: fresh.credits,
      free: {
        limit: quota.limit,
        used: quota.used,
        remaining: quota.remaining,
        resetsAt: quota.resetsAt?.toISOString() ?? null,
      },
      creditsPerGeneration: CREDITS_PER_GENERATION,
      premiumStyles: [...PREMIUM_STYLE_IDS],
    }
  }
}
