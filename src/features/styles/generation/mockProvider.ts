import { getStyle } from '../catalog'
import type { MockEffect } from '../types'
import { renderMockStyle } from './render'
import {
  GenerationError,
  type AvatarGenerationProvider,
  type GenerationProgress,
  type ProviderInfo,
} from './types'

export const MOCK_PROVIDER_INFO: ProviderInfo = {
  id: 'mock-filters',
  name: 'Preview filters (mock)',
  kind: 'mock',
  runsOnDevice: true,
}

export interface MockProviderOptions {
  /** Delay between simulated progress ticks. */
  stepMs?: number
  /** Probability (0–1) that a request fails with a simulated, retryable error. */
  failureRate?: number
  random?: () => number
  /** Turns the photo + effect into an image. Defaults to the canvas renderer. */
  render?: RenderFn
}

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new GenerationError('cancelled'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new GenerationError('cancelled'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

type RenderFn = (image: Blob, effect: MockEffect) => Promise<Blob>

const PROGRESS_STEPS: readonly GenerationProgress[] = [
  { stage: 'queued', percent: 5 },
  { stage: 'processing', percent: 25 },
  { stage: 'processing', percent: 50 },
  { stage: 'processing', percent: 75 },
  { stage: 'finalizing', percent: 90 },
]

/**
 * MOCK provider. Simulates the timing, progress and failure modes of a real generation service
 * while applying simple on-device colour filters (see `effects.ts`).
 * It does not perform any AI transformation and must always be labelled as a mock in the UI.
 */
export function createMockProvider(options: MockProviderOptions = {}): AvatarGenerationProvider {
  const { stepMs = 300, failureRate = 0, random = Math.random } = options

  return {
    info: MOCK_PROVIDER_INFO,

    async generate({ image, styleId, signal, onProgress }) {
      const style = getStyle(styleId)
      if (!style) throw new GenerationError('invalid-input', `Unknown style "${styleId}"`)
      if (!image || image.size === 0) throw new GenerationError('invalid-input', 'Empty image')

      for (const step of PROGRESS_STEPS) {
        await wait(stepMs, signal)
        onProgress?.(step)
        if (step.stage === 'processing' && step.percent === 50 && random() < failureRate) {
          throw new GenerationError('provider-error', 'Simulated failure (mock provider)')
        }
      }

      const render = options.render ?? renderMockStyle
      let output: Blob
      try {
        output = await render(image, style.mock)
      } catch (error) {
        throw new GenerationError('provider-error', 'Mock render failed', { cause: error })
      }
      if (signal?.aborted) throw new GenerationError('cancelled')

      onProgress?.({ stage: 'finalizing', percent: 100 })
      return { image: output, styleId, provider: MOCK_PROVIDER_INFO, createdAt: Date.now() }
    },
  }
}

/** `?mockFailRate=0.5` lets QA and reviewers exercise the error/retry UI. Clamped to 0–1. */
export function failureRateFromSearch(search: string): number {
  const raw = Number(new URLSearchParams(search).get('mockFailRate'))
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0
}
