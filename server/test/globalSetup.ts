import { readdirSync, readFileSync } from 'node:fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from 'pg'
import S3rver from 's3rver'
import type { TestProject } from 'vitest/node'

/**
 * Real infrastructure for integration tests:
 * - PostgreSQL: TEST_DATABASE_URL (CI service container), or the local dev server.
 *   A dedicated database is recreated and every migration in prisma/migrations is applied.
 * - S3: an in-process S3 API emulator (s3rver) with a private bucket.
 */
const ADMIN_URL =
  process.env['TEST_DATABASE_ADMIN_URL'] ??
  'postgresql://postgres@localhost:5433/postgres?host=/tmp'
const TEST_DB = 'avatar_studio_test'

export const S3_BUCKET = 'avatars-test'

export default async function setup(project: TestProject) {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${TEST_DB}`)
  await admin.end()

  const url = new URL(ADMIN_URL)
  url.pathname = `/${TEST_DB}`
  const databaseUrl = url.toString()

  const db = new Client({ connectionString: databaseUrl })
  await db.connect()
  const dir = join(import.meta.dirname, '..', 'prisma', 'migrations')
  for (const name of readdirSync(dir)
    .filter((n) => /^\d+_/.test(n))
    .sort()) {
    await db.query(readFileSync(join(dir, name, 'migration.sql'), 'utf8'))
  }
  await db.end()

  const s3Dir = mkdtempSync(join(tmpdir(), 's3rver-'))
  const s3 = new S3rver({
    port: 0,
    address: '127.0.0.1',
    silent: true,
    directory: s3Dir,
    configureBuckets: [{ name: S3_BUCKET, configs: [] }],
  })
  const { port } = await s3.run()

  project.provide('databaseUrl', databaseUrl)
  project.provide('s3Endpoint', `http://127.0.0.1:${port}`)
  project.provide('s3Bucket', S3_BUCKET)

  return async () => {
    await s3.close()
    rmSync(s3Dir, { recursive: true, force: true })
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
    s3Endpoint: string
    s3Bucket: string
  }
}
