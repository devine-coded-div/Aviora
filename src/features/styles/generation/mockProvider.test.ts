import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_STYLE_ID } from '../catalog'
import type { MockEffect } from '../types'
import { createMockProvider, failureRateFromSearch, MOCK_PROVIDER_INFO } from './mockProvider'
import type { GenerationProgress } from './types'

const photo = () => new Blob([new Uint8Array(100)], { type: 'image/jpeg' })
const rendered = new Blob(['styled'], { type: 'image/png' })
const render = vi.fn<(image: Blob, effect: MockEffect) => Promise<Blob>>()

function provider(options: Parameters<typeof createMockProvider>[0] = {}) {
  render.mockResolvedValue(rendered)
  return createMockProvider({ stepMs: 0, render, ...options })
}

describe('mock provider', () => {
  it('identifies itself as an on-device mock', () => {
    expect(provider().info).toEqual(MOCK_PROVIDER_INFO)
    expect(MOCK_PROVIDER_INFO).toMatchObject({ kind: 'mock', runsOnDevice: true })
  })

  it('reports staged, non-decreasing progress that ends at 100', async () => {
    const updates: GenerationProgress[] = []
    await provider().generate({
      image: photo(),
      styleId: DEFAULT_STYLE_ID,
      onProgress: (p) => updates.push(p),
    })

    const percents = updates.map((u) => u.percent)
    expect(percents).toEqual([...percents].sort((a, b) => a - b))
    expect(percents.at(-1)).toBe(100)
    expect(updates.map((u) => u.stage)).toEqual(
      expect.arrayContaining(['queued', 'processing', 'finalizing']),
    )
  })

  it('applies the style’s mock effect and returns a labelled result', async () => {
    const image = photo()
    const result = await provider().generate({ image, styleId: 'pixel-8bit' })

    expect(render).toHaveBeenCalledWith(image, expect.objectContaining({ pixelate: 32 }))
    expect(result).toMatchObject({
      image: rendered,
      styleId: 'pixel-8bit',
      provider: { kind: 'mock' },
    })
  })

  it('rejects unknown styles and empty images as invalid input (not retryable)', async () => {
    await expect(provider().generate({ image: photo(), styleId: 'nope' })).rejects.toMatchObject({
      kind: 'invalid-input',
      retryable: false,
    })
    await expect(
      provider().generate({ image: new Blob([]), styleId: DEFAULT_STYLE_ID }),
    ).rejects.toMatchObject({ kind: 'invalid-input' })
  })

  it('simulates retryable failures at the configured rate', async () => {
    await expect(
      provider({ failureRate: 1 }).generate({ image: photo(), styleId: DEFAULT_STYLE_ID }),
    ).rejects.toMatchObject({ kind: 'provider-error', retryable: true })
    expect(render).not.toHaveBeenCalled()
  })

  it('stops promptly when cancelled', async () => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const pending = createMockProvider({ stepMs: 1000, render }).generate({
        image: photo(),
        styleId: DEFAULT_STYLE_ID,
        signal: controller.signal,
      })
      // Observe the rejection early so it isn't reported as unhandled while timers advance.
      pending.catch(() => {})
      await vi.advanceTimersByTimeAsync(1500)
      controller.abort()
      await expect(pending).rejects.toMatchObject({ kind: 'cancelled', retryable: false })
      expect(render).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('wraps render failures as provider errors', async () => {
    const p = provider()
    render.mockRejectedValueOnce(new Error('canvas exploded'))
    await expect(p.generate({ image: photo(), styleId: DEFAULT_STYLE_ID })).rejects.toMatchObject({
      kind: 'provider-error',
    })
  })
})

describe('failureRateFromSearch', () => {
  it.each([
    ['', 0],
    ['?mockFailRate=0.5', 0.5],
    ['?mockFailRate=7', 1],
    ['?mockFailRate=-1', 0],
    ['?mockFailRate=abc', 0],
  ])('%s → %d', (search, rate) => {
    expect(failureRateFromSearch(search)).toBe(rate)
  })
})
