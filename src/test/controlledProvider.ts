import { vi } from 'vitest'
import {
  GenerationError,
  type AvatarGenerationProvider,
  type GenerationErrorKind,
  type GenerationRequest,
  type GenerationResult,
  type ProviderInfo,
} from '@/features/styles'

interface Pending {
  request: GenerationRequest
  resolve: (r: GenerationResult) => void
  reject: (e: unknown) => void
}

/**
 * A provider whose every request waits until the test settles it, so loading, progress,
 * success, failure and cancellation can each be asserted deterministically.
 */
export function controlledProvider(info: Partial<ProviderInfo> = {}) {
  const pending: Pending[] = []
  const providerInfo: ProviderInfo = {
    id: 'test',
    name: 'Test provider',
    kind: 'mock',
    runsOnDevice: true,
    ...info,
  }
  const generate = vi.fn<(r: GenerationRequest) => Promise<GenerationResult>>(
    (request) =>
      new Promise((resolve, reject) => {
        pending.push({ request, resolve, reject })
        request.signal?.addEventListener('abort', () => reject(new GenerationError('cancelled')))
      }),
  )
  const provider: AvatarGenerationProvider = { info: providerInfo, generate }

  const latest = () => {
    const p = pending.at(-1)
    if (!p) throw new Error('No pending generation')
    return p
  }

  return {
    provider,
    generate,
    latest,
    progress(percent: number, stage: 'queued' | 'processing' | 'finalizing' = 'processing') {
      latest().request.onProgress?.({ stage, percent })
    },
    succeed() {
      const { request, resolve } = latest()
      resolve({
        image: new Blob(['styled'], { type: 'image/png' }),
        styleId: request.styleId,
        provider: providerInfo,
        createdAt: Date.now(),
      })
    },
    fail(kind: Exclude<GenerationErrorKind, 'cancelled'>) {
      latest().reject(new GenerationError(kind))
    },
  }
}
