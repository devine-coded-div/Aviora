import { z } from 'zod'

/**
 * Server configuration, read once from environment variables and validated.
 * Secrets (database URL, storage keys, AI provider key) live only here, on the server; nothing in
 * this module is ever serialized into an API response.
 */

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1')

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** `json` (one object per line) or `text`. Defaults to json in production. */
  LOG_FORMAT: z.enum(['json', 'text']).optional(),
  /** Log one line per request (method, route, status, duration, request id). */
  LOG_REQUESTS: bool.default(true),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /** Browser origins allowed to call the API, e.g. https://devine-coded-div.github.io */
  CORS_ORIGINS: csv,
  /** Number of proxy hops to trust for the client IP (0 when not behind a proxy). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Secret for hashing client IPs. Required in production. */
  CLIENT_HASH_SECRET: z.string().min(16).optional(),

  STORAGE_DRIVER: z.enum(['s3', 'memory']).default('s3'),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool.default(false),
  /** Prefix for every object key, so the bucket can be shared safely. */
  S3_KEY_PREFIX: z.string().default('avatar-studio/'),

  AI_PROVIDER: z.string().default('mock'),
  AI_PROVIDER_API_KEY: z.string().optional(),
  /** Style ids the configured provider supports. */
  AI_PROVIDER_STYLES: csv,
  AI_PROVIDER_COST_PER_IMAGE_USD: z.coerce.number().nonnegative().optional(),
  /** How many days the provider itself keeps uploaded images (from its terms). */
  AI_PROVIDER_RETENTION_DAYS: z.coerce.number().int().nonnegative().optional(),
  /** Must be explicitly "false": we promise users their photos are never used for training. */
  AI_PROVIDER_TRAINS_ON_INPUTS: bool.optional(),
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  /** Hard spending cap per rolling 24 hours. Required for a paid provider. */
  AI_DAILY_BUDGET_USD: z.coerce.number().nonnegative().optional(),

  /** Razorpay credentials. Payments are disabled unless all three are set. */
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_API_BASE: z.url().default('https://api.razorpay.com'),
  /** Live keys (rzp_live_…) are refused unless NODE_ENV=production and this is true. */
  PAYMENTS_ALLOW_LIVE: bool.default(false),
  ORDER_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),
  ORDERS_PER_HOUR: z.coerce.number().int().positive().default(20),

  /** Free generations per rolling 24 h, per account and per client IP. */
  FREE_GENERATIONS_PER_DAY: z.coerce.number().int().nonnegative().default(3),
  ACCOUNTS_PER_HOUR: z.coerce.number().int().positive().default(10),

  MOCK_DELAY_MS: z.coerce.number().int().nonnegative().default(1500),
  MOCK_FAIL_RATE: z.coerce.number().min(0).max(1).default(0),

  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 1024 * 1024),
  GENERATIONS_PER_HOUR: z.coerce.number().int().positive().default(20),
  MAX_ACTIVE_JOBS_PER_CLIENT: z.coerce.number().int().positive().default(2),
  API_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(120),

  JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  JOB_MAX_MANUAL_RETRIES: z.coerce.number().int().min(0).max(10).default(2),
  JOB_RETRY_BASE_MS: z.coerce.number().int().nonnegative().default(2000),
  JOB_PROCESSING_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(1000),
  /** Generated results are deleted (object + row) after this. */
  RESULT_TTL_HOURS: z.coerce.number().positive().default(24),
  /** Inputs of failed jobs are kept this long so the user can retry, then deleted. */
  FAILED_INPUT_TTL_MINUTES: z.coerce.number().positive().default(60),
  CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
})

export type Env = z.infer<typeof EnvSchema>

/** Terms a real provider must declare before it can be enabled. */
export interface ProviderTerms {
  apiKey: string
  styles: string[]
  costPerImageUsd: number
  retentionDays: number
  trainsOnInputs: false
  dailyBudgetUsd: number
}

/** Upper bound on how long a third-party provider may keep users' photos. */
export const MAX_PROVIDER_RETENTION_DAYS = 30

export class ConfigError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(`Invalid server configuration:\n- ${problems.join('\n- ')}`)
    this.name = 'ConfigError'
    this.problems = problems
  }
}

export interface PaymentsConfig {
  keyId: string
  keySecret: string
  webhookSecret: string
  apiBase: string
  testMode: boolean
}

export type Config = Env & { providerTerms: ProviderTerms | null; payments: PaymentsConfig | null }

/**
 * Parse and cross-check the environment. Throws ConfigError listing every problem, so a
 * misconfigured server refuses to start instead of running with unsafe defaults.
 */
export function loadConfig(source: Record<string, string | undefined> = process.env): Config {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
  }
  const env = parsed.data
  const problems: string[] = []

  if (env.NODE_ENV === 'production') {
    if (!env.CLIENT_HASH_SECRET) problems.push('CLIENT_HASH_SECRET is required in production')
    else if (env.CLIENT_HASH_SECRET.length < 32) {
      problems.push('CLIENT_HASH_SECRET must be at least 32 characters')
    }
    if (env.STORAGE_DRIVER !== 's3') problems.push('STORAGE_DRIVER must be "s3" in production')
    if (env.CORS_ORIGINS.length === 0) problems.push('CORS_ORIGINS is required in production')
    const insecure = env.CORS_ORIGINS.filter((o) => !o.startsWith('https://'))
    if (insecure.length > 0) {
      problems.push(`CORS_ORIGINS must be https in production (got ${insecure.join(', ')})`)
    }
  }
  if (env.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
      if (!env[key]) problems.push(`${key} is required when STORAGE_DRIVER=s3`)
    }
  }

  let providerTerms: ProviderTerms | null = null
  if (env.AI_PROVIDER !== 'mock') {
    const missing: string[] = []
    if (!env.AI_PROVIDER_API_KEY) missing.push('AI_PROVIDER_API_KEY')
    if (env.AI_PROVIDER_STYLES.length === 0) missing.push('AI_PROVIDER_STYLES')
    if (env.AI_PROVIDER_COST_PER_IMAGE_USD === undefined)
      missing.push('AI_PROVIDER_COST_PER_IMAGE_USD')
    if (env.AI_PROVIDER_RETENTION_DAYS === undefined) missing.push('AI_PROVIDER_RETENTION_DAYS')
    if (env.AI_PROVIDER_TRAINS_ON_INPUTS === undefined) missing.push('AI_PROVIDER_TRAINS_ON_INPUTS')
    if (env.AI_DAILY_BUDGET_USD === undefined) missing.push('AI_DAILY_BUDGET_USD')
    if (missing.length > 0) {
      problems.push(
        `AI_PROVIDER="${env.AI_PROVIDER}" can't be enabled until its terms are configured. Missing: ${missing.join(', ')}`,
      )
    }
    if (env.AI_PROVIDER_TRAINS_ON_INPUTS === true) {
      problems.push(
        'AI_PROVIDER_TRAINS_ON_INPUTS must be false — users are promised no training use',
      )
    }
    if ((env.AI_PROVIDER_RETENTION_DAYS ?? 0) > MAX_PROVIDER_RETENTION_DAYS) {
      problems.push(
        `AI_PROVIDER_RETENTION_DAYS must be ≤ ${MAX_PROVIDER_RETENTION_DAYS} (provider keeps images too long)`,
      )
    }
    if (missing.length === 0 && env.AI_PROVIDER_TRAINS_ON_INPUTS === false) {
      providerTerms = {
        apiKey: env.AI_PROVIDER_API_KEY!,
        styles: env.AI_PROVIDER_STYLES,
        costPerImageUsd: env.AI_PROVIDER_COST_PER_IMAGE_USD!,
        retentionDays: env.AI_PROVIDER_RETENTION_DAYS!,
        trainsOnInputs: false,
        dailyBudgetUsd: env.AI_DAILY_BUDGET_USD!,
      }
    }
  }

  let payments: PaymentsConfig | null = null
  const rzp = [env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET, env.RAZORPAY_WEBHOOK_SECRET]
  if (rzp.some(Boolean)) {
    if (!rzp.every(Boolean)) {
      problems.push(
        'Payments need RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET together',
      )
    } else {
      const keyId = env.RAZORPAY_KEY_ID!
      const live = keyId.startsWith('rzp_live_')
      if (!live && !keyId.startsWith('rzp_test_')) {
        problems.push('RAZORPAY_KEY_ID must start with rzp_test_ or rzp_live_')
      }
      if (live && !(env.NODE_ENV === 'production' && env.PAYMENTS_ALLOW_LIVE)) {
        problems.push(
          'Live Razorpay keys are refused: use rzp_test_ keys in development, or set NODE_ENV=production and PAYMENTS_ALLOW_LIVE=true',
        )
      }
      if (env.NODE_ENV === 'production' && !env.RAZORPAY_API_BASE.startsWith('https://')) {
        problems.push('RAZORPAY_API_BASE must use https in production')
      }
      payments = {
        keyId,
        keySecret: env.RAZORPAY_KEY_SECRET!,
        webhookSecret: env.RAZORPAY_WEBHOOK_SECRET!,
        apiBase: env.RAZORPAY_API_BASE.replace(/\/+$/, ''),
        testMode: !live,
      }
    }
  }

  if (problems.length > 0) throw new ConfigError(problems)
  return { ...env, providerTerms, payments }
}
