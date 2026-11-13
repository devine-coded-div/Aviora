import { createContext, useContext } from 'react'
import type { AvatarGenerationProvider } from './types'

export const GenerationProviderContext = createContext<AvatarGenerationProvider | null>(null)

export function useGenerationProvider(): AvatarGenerationProvider {
  const provider = useContext(GenerationProviderContext)
  if (!provider)
    throw new Error('useGenerationProvider must be used inside GenerationProviderScope')
  return provider
}
