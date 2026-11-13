import { useState, type ReactNode } from 'react'
import { createMockProvider, failureRateFromSearch } from './mockProvider'
import { GenerationProviderContext } from './providerContext'
import type { AvatarGenerationProvider } from './types'

/**
 * Supplies the avatar generation provider. Defaults to the on-device mock; tests and the
 * future AI integration pass their own `provider`.
 */
export function GenerationProviderScope({
  provider,
  children,
}: {
  provider?: AvatarGenerationProvider
  children: ReactNode
}) {
  const [fallback] = useState(() =>
    createMockProvider({ failureRate: failureRateFromSearch(window.location.search) }),
  )
  return (
    <GenerationProviderContext.Provider value={provider ?? fallback}>
      {children}
    </GenerationProviderContext.Provider>
  )
}
