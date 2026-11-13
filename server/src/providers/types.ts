/** Server-side image generation provider. Credentials never leave the server. */
export interface ProviderInfo {
  id: string
  name: string
  kind: 'mock' | 'ai'
  styles: readonly string[]
  /** Estimated cost per generated image, used for the daily budget. */
  costPerImageUsd: number
  /** Days the provider keeps uploaded images under its terms (0 = not stored). */
  retentionDays: number
  trainsOnInputs: false
}

export interface GenerateInput {
  image: Buffer
  mime: string
  styleId: string
  signal: AbortSignal
}

export interface GenerateOutput {
  image: Buffer
  mime: 'image/png' | 'image/jpeg' | 'image/webp'
}

export interface AvatarProvider {
  readonly info: ProviderInfo
  generate(input: GenerateInput): Promise<GenerateOutput>
}

export type ProviderErrorKind =
  | 'timeout'
  | 'rate-limited'
  | 'unavailable'
  | 'invalid-input'
  | 'content-rejected'
  | 'provider-error'

const RETRYABLE: ReadonlySet<ProviderErrorKind> = new Set([
  'timeout',
  'rate-limited',
  'unavailable',
  'provider-error',
])

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly retryable: boolean
  constructor(kind: ProviderErrorKind, message?: string, options?: { cause?: unknown }) {
    super(message ?? kind, options)
    this.name = 'ProviderError'
    this.kind = kind
    this.retryable = RETRYABLE.has(kind)
  }
}
