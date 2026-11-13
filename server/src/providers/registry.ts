import type { Config, ProviderTerms } from '../config.ts'
import { createMockProvider } from './mock.ts'
import type { AvatarProvider } from './types.ts'

/**
 * Real provider adapters register here. Each receives the validated terms (API key, styles,
 * cost, retention) and must implement AvatarProvider. None are implemented yet: a vendor is
 * added only once its credentials, capabilities, cost and retention terms are agreed.
 */
const ADAPTERS: Record<string, (terms: ProviderTerms, config: Config) => AvatarProvider> = {}

export class ProviderSetupError extends Error {
  override readonly name = 'ProviderSetupError'
}

export function createProvider(config: Config): AvatarProvider {
  if (config.AI_PROVIDER === 'mock') {
    return createMockProvider({ delayMs: config.MOCK_DELAY_MS, failRate: config.MOCK_FAIL_RATE })
  }
  const adapter = ADAPTERS[config.AI_PROVIDER]
  if (!adapter) {
    throw new ProviderSetupError(
      `No adapter is implemented for AI_PROVIDER="${config.AI_PROVIDER}". Known: mock${Object.keys(
        ADAPTERS,
      )
        .map((k) => `, ${k}`)
        .join('')}`,
    )
  }
  if (!config.providerTerms) {
    throw new ProviderSetupError(`AI_PROVIDER="${config.AI_PROVIDER}" has no validated terms`)
  }
  return adapter(config.providerTerms, config)
}
