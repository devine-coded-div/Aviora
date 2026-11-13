/**
 * Contract between the editor and whatever produces stylized avatars.
 * Phase 3 ships a mock; Phase 6 adds a server-backed AI provider behind the same interface.
 */

export interface ProviderInfo {
  id: string
  /** Shown to users, e.g. "Preview filters". */
  name: string
  /** `mock` providers must be labelled as such in the UI. */
  kind: 'mock' | 'ai'
  /** True when the photo never leaves the device. */
  runsOnDevice: boolean
}

export type GenerationStage = 'queued' | 'processing' | 'finalizing'

export interface GenerationProgress {
  stage: GenerationStage
  /** 0–100, non-decreasing within one request. */
  percent: number
}

export interface GenerationRequest {
  /** The square cropped photo. */
  image: Blob
  styleId: string
  signal?: AbortSignal | undefined
  onProgress?: ((progress: GenerationProgress) => void) | undefined
}

export interface GenerationResult {
  image: Blob
  styleId: string
  provider: ProviderInfo
  createdAt: number
}

export interface AvatarGenerationProvider {
  readonly info: ProviderInfo
  /** Resolves with a result or rejects with a `GenerationError`. Must honour `signal`. */
  generate(request: GenerationRequest): Promise<GenerationResult>
}

export type GenerationErrorKind =
  'cancelled' | 'invalid-input' | 'timeout' | 'rate-limited' | 'network' | 'provider-error'

export class GenerationError extends Error {
  readonly kind: GenerationErrorKind
  /** Whether trying again might succeed. */
  readonly retryable: boolean

  constructor(kind: GenerationErrorKind, message?: string, options?: { cause?: unknown }) {
    super(message ?? kind, options)
    this.name = 'GenerationError'
    this.kind = kind
    this.retryable = kind !== 'invalid-input' && kind !== 'cancelled'
  }
}

export function toGenerationError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new GenerationError('cancelled', undefined, { cause: error })
  }
  return new GenerationError('provider-error', undefined, { cause: error })
}
