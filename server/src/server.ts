import { randomBytes } from 'node:crypto'
import { AccountService } from './billing/accounts.ts'
import { PaymentService } from './billing/payments.ts'
import { RazorpayClient } from './billing/razorpay.ts'
import { ConfigError, loadConfig } from './config.ts'
import { createDb } from './db.ts'
import { createApp } from './http/app.ts'
import { sweep } from './jobs/cleanup.ts'
import { JobService } from './jobs/service.ts'
import { JobWorker } from './jobs/worker.ts'
import { createProvider, ProviderSetupError } from './providers/registry.ts'
import { MemoryStorage } from './storage/memory.ts'
import { S3Storage } from './storage/s3.ts'
import type { ObjectStorage } from './storage/types.ts'

async function main() {
  let config
  try {
    config = loadConfig()
  } catch (error) {
    console.error(error instanceof ConfigError ? error.message : error)
    process.exit(1)
  }

  const db = createDb(config.DATABASE_URL)
  const storage: ObjectStorage =
    config.STORAGE_DRIVER === 's3'
      ? new S3Storage({
          bucket: config.S3_BUCKET!,
          region: config.S3_REGION,
          endpoint: config.S3_ENDPOINT,
          accessKeyId: config.S3_ACCESS_KEY_ID!,
          secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
          forcePathStyle: config.S3_FORCE_PATH_STYLE,
          keyPrefix: config.S3_KEY_PREFIX,
        })
      : new MemoryStorage()
  let provider
  try {
    provider = createProvider(config)
  } catch (error) {
    console.error(error instanceof ProviderSetupError ? error.message : error)
    process.exit(1)
  }
  const service = new JobService({ db, storage, provider, config })
  const worker = new JobWorker({ db, storage, provider, config })
  const clientSecret = config.CLIENT_HASH_SECRET ?? randomBytes(32).toString('hex')

  const accounts = new AccountService({ db, config })
  const gateway = config.payments ? new RazorpayClient(config.payments) : null
  const payments = new PaymentService({ db, gateway, config })

  const app = createApp({ config, db, provider, service, accounts, payments, worker, clientSecret })
  worker.start()
  const cleanup = setInterval(() => {
    sweep({ db, storage, config }).catch((error: unknown) => console.error('cleanup failed', error))
    payments.expireStale().catch((error: unknown) => console.error('order expiry failed', error))
  }, config.CLEANUP_INTERVAL_MS)

  const server = app.listen(config.PORT, () => {
    console.info(
      `API listening on :${config.PORT} (provider: ${provider.info.id}, storage: ${config.STORAGE_DRIVER}, payments: ${
        config.payments
          ? config.payments.testMode
            ? 'Razorpay test mode'
            : 'Razorpay LIVE'
          : 'disabled'
      })`,
    )
  })

  const shutdown = async () => {
    console.info('Shutting down…')
    clearInterval(cleanup)
    server.close()
    await worker.stop()
    await db.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT', () => void shutdown())
}

void main()
