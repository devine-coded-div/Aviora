/**
 * Typed access to public, build-time environment variables.
 *
 * Only `VITE_`-prefixed variables reach the browser bundle, and everything here is
 * visible to users. Never put API keys or other secrets in these variables — AI provider
 * and payment credentials belong on the server (Phase 6+).
 */
export interface PublicEnv {
  /** Base URL of the backend API. Empty until the backend exists (Phase 6). */
  apiBaseUrl: string
  mode: string
  isDev: boolean
  isProd: boolean
}

export function readPublicEnv(source: Record<string, unknown>): PublicEnv {
  const raw = source['VITE_API_BASE_URL']
  const apiBaseUrl = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : ''
  const mode = typeof source['MODE'] === 'string' ? source['MODE'] : 'development'

  return {
    apiBaseUrl,
    mode,
    isDev: source['DEV'] === true,
    isProd: source['PROD'] === true,
  }
}

export const env: PublicEnv = readPublicEnv(import.meta.env)
