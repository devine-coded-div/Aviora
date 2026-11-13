export { AVATAR_STYLES, STYLE_CATEGORIES, getStyle, type StyleId } from './catalog'
export { StyleStep } from './components/StyleStep'
export { GenerationProviderScope } from './generation/ProviderContext'
export { useGenerationProvider } from './generation/providerContext'
export { createMockProvider, MOCK_PROVIDER_INFO } from './generation/mockProvider'
export {
  GenerationError,
  type AvatarGenerationProvider,
  type GenerationErrorKind,
  type GenerationProgress,
  type GenerationRequest,
  type GenerationResult,
  type ProviderInfo,
} from './generation/types'
export { useStyleStore, type StyleResult } from './store'
export type { AvatarStyle, StyleCategory } from './types'
