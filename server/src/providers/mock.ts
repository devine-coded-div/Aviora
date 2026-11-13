import sharp from 'sharp'
import { STYLE_IDS } from '../styles.ts'
import { ProviderError, type AvatarProvider, type GenerateInput } from './types.ts'

export interface MockProviderOptions {
  delayMs: number
  failRate: number
  random?: () => number
}

/**
 * MOCK provider: simple image adjustments with sharp, plus simulated latency and failures.
 * It performs no AI transformation; `kind: 'mock'` makes clients label results accordingly.
 */
export function createMockProvider({
  delayMs,
  failRate,
  random = Math.random,
}: MockProviderOptions): AvatarProvider {
  return {
    info: {
      id: 'mock',
      name: 'Mock filters (not AI)',
      kind: 'mock',
      styles: STYLE_IDS,
      costPerImageUsd: 0,
      retentionDays: 0,
      trainsOnInputs: false,
    },

    async generate({ image, styleId, signal }: GenerateInput) {
      await wait(delayMs, signal)
      if (random() < failRate)
        throw new ProviderError('unavailable', 'Simulated failure (mock provider)')

      let pipeline = sharp(image)
      if (styleId.startsWith('pixel')) {
        const cells = styleId === 'pixel-8bit' ? 32 : 64
        const small = await sharp(image).resize(cells, cells, { kernel: 'nearest' }).toBuffer()
        pipeline = sharp(small).resize(1024, 1024, { kernel: 'nearest' })
      } else if (styleId.startsWith('cartoon')) {
        pipeline = pipeline.modulate({ saturation: 1.6 }).linear(1.25, -20)
      } else if (styleId.startsWith('anime')) {
        pipeline = pipeline.modulate({ saturation: 1.3, brightness: 1.08 })
      } else if (styleId.startsWith('realistic')) {
        pipeline = pipeline.modulate({ saturation: 0.95 }).linear(1.1, -8)
      } else {
        pipeline = pipeline.modulate({ saturation: 0.7 }).linear(1.15, -12)
      }
      const out = await pipeline.png().toBuffer()
      if (signal.aborted) throw new ProviderError('timeout')
      return { image: out, mime: 'image/png' as const }
    },
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new ProviderError('timeout'))
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new ProviderError('timeout'))
      },
      { once: true },
    )
  })
}
