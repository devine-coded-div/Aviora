import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig, MAX_PROVIDER_RETENTION_DAYS } from '../src/config.ts'
import { createMockProvider } from '../src/providers/mock.ts'
import { createProvider, ProviderSetupError } from '../src/providers/registry.ts'
import { STYLE_IDS } from '../src/styles.ts'
import { buildTestApp, testConfig } from './helpers.ts'

const base = { DATABASE_URL: 'postgresql://x', STORAGE_DRIVER: 'memory' }
const paid = {
  ...base,
  AI_PROVIDER: 'acme',
  AI_PROVIDER_API_KEY: 'sk-live-very-secret',
  AI_PROVIDER_STYLES: 'anime-classic,pixel-8bit',
  AI_PROVIDER_COST_PER_IMAGE_USD: '0.04',
  AI_PROVIDER_RETENTION_DAYS: '0',
  AI_PROVIDER_TRAINS_ON_INPUTS: 'false',
  AI_DAILY_BUDGET_USD: '20',
}

function problems(env: Record<string, string>): string[] {
  try {
    loadConfig(env)
    return []
  } catch (error) {
    return error instanceof ConfigError ? error.problems : [String(error)]
  }
}

describe('AI provider gate', () => {
  it('uses the mock provider by default', () => {
    expect(loadConfig(base).providerTerms).toBeNull()
    expect(createProvider(loadConfig(base)).info.kind).toBe('mock')
  })

  it('refuses a real provider until every term is configured', () => {
    const found = problems({ ...base, AI_PROVIDER: 'acme', AI_PROVIDER_API_KEY: 'k' })
    expect(found).toHaveLength(1)
    for (const key of [
      'AI_PROVIDER_STYLES',
      'AI_PROVIDER_COST_PER_IMAGE_USD',
      'AI_PROVIDER_RETENTION_DAYS',
      'AI_PROVIDER_TRAINS_ON_INPUTS',
      'AI_DAILY_BUDGET_USD',
    ]) {
      expect(found[0]).toContain(key)
    }
  })

  it('refuses providers that train on inputs or keep images too long', () => {
    expect(problems({ ...paid, AI_PROVIDER_TRAINS_ON_INPUTS: 'true' }).join()).toMatch(
      /must be false/,
    )
    expect(
      problems({
        ...paid,
        AI_PROVIDER_RETENTION_DAYS: String(MAX_PROVIDER_RETENTION_DAYS + 1),
      }).join(),
    ).toMatch(/RETENTION_DAYS/)
  })

  it('accepts complete terms, but still needs an implemented adapter', () => {
    const config = loadConfig(paid)
    expect(config.providerTerms).toMatchObject({
      costPerImageUsd: 0.04,
      retentionDays: 0,
      trainsOnInputs: false,
    })
    expect(() => createProvider(config)).toThrow(ProviderSetupError)
    expect(() => createProvider(config)).toThrow(/No adapter is implemented for AI_PROVIDER="acme"/)
  })
})

describe('production safety', () => {
  it('requires a hashing secret, S3 storage and CORS origins in production', () => {
    const found = problems({ ...base, NODE_ENV: 'production' }).join('\n')
    expect(found).toMatch(/CLIENT_HASH_SECRET/)
    expect(found).toMatch(/STORAGE_DRIVER must be "s3"/)
    expect(found).toMatch(/CORS_ORIGINS/)
  })

  it('requires S3 credentials for the S3 driver', () => {
    expect(problems({ DATABASE_URL: 'postgresql://x', STORAGE_DRIVER: 's3' }).join()).toMatch(
      /S3_BUCKET/,
    )
  })
})

describe('credentials never reach the browser', () => {
  it('describes the provider without keys or internal config', async () => {
    const config = {
      ...testConfig(),
      AI_PROVIDER_API_KEY: 'sk-live-very-secret',
      S3_SECRET_ACCESS_KEY: 's3-secret',
    }
    const { app } = buildTestApp({ config })
    const res = await request(app).get('/api/provider')
    expect(res.body).toEqual({
      id: 'fake',
      name: 'Fake provider',
      kind: 'mock',
      styles: [...STYLE_IDS],
      privacy: {
        trainsOnInputs: false,
        providerRetentionDays: 0,
        uploadsDeleted: 'after processing',
        resultsDeletedAfterHours: 24,
      },
    })
    const text = JSON.stringify(res.body)
    for (const secret of ['sk-live-very-secret', 's3-secret', config.DATABASE_URL])
      expect(text).not.toContain(secret)
  })

  it('keeps provider secrets out of the frontend bundle sources', () => {
    const root = join(import.meta.dirname, '..', '..')
    const env = readFileSync(join(root, '.env.example'), 'utf8')
    expect(env).not.toMatch(/AI_PROVIDER|S3_SECRET|DATABASE_URL/)
  })
})

describe('mock provider', () => {
  it('is labelled as a mock and declares no retention or training', () => {
    const p = createMockProvider({ delayMs: 0, failRate: 0 })
    expect(p.info).toMatchObject({
      kind: 'mock',
      retentionDays: 0,
      trainsOnInputs: false,
      costPerImageUsd: 0,
    })
  })
})

describe('style catalog', () => {
  it('matches the frontend catalog exactly', () => {
    const catalog = readFileSync(
      join(import.meta.dirname, '..', '..', 'src', 'features', 'styles', 'catalog.ts'),
      'utf8',
    )
    const frontendIds = [...catalog.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1])
    expect(frontendIds).toEqual([...STYLE_IDS])
  })
})
