import { describe, expect, it } from 'vitest'
import { readPublicEnv } from './env'

describe('readPublicEnv', () => {
  it('normalizes the API base URL by trimming whitespace and trailing slashes', () => {
    const env = readPublicEnv({
      VITE_API_BASE_URL: '  https://api.example.com//  ',
      MODE: 'production',
      PROD: true,
      DEV: false,
    })

    expect(env).toEqual({
      apiBaseUrl: 'https://api.example.com',
      mode: 'production',
      isDev: false,
      isProd: true,
    })
  })

  it('falls back to safe defaults when variables are missing or malformed', () => {
    const env = readPublicEnv({ VITE_API_BASE_URL: 42 })

    expect(env.apiBaseUrl).toBe('')
    expect(env.mode).toBe('development')
    expect(env.isDev).toBe(false)
    expect(env.isProd).toBe(false)
  })
})
