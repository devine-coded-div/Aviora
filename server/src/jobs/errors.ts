import { ProviderError, type ProviderErrorKind } from '../providers/types.ts'

/** User-safe messages. Provider internals are logged server-side, never returned. */
export const JOB_ERROR_MESSAGES: Record<ProviderErrorKind | 'input-missing', string> = {
  timeout: 'The style took too long to generate. Try again.',
  'rate-limited': 'The AI service is busy right now. Try again in a moment.',
  unavailable: 'The AI service is unavailable right now. Try again shortly.',
  'invalid-input': 'This photo can’t be processed. Try a different photo.',
  'content-rejected': 'This photo was rejected by the AI service’s content rules.',
  'provider-error': 'Generation failed. Try again.',
  'input-missing': 'The uploaded photo is no longer available. Upload it again.',
}

export function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ProviderError('timeout', undefined, { cause: error })
  }
  return new ProviderError('provider-error', undefined, { cause: error })
}
