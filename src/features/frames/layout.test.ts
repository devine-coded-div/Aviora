import { describe, expect, it } from 'vitest'
import { flameTongues, normalizedLayout, pixelLayout, SAFE_RADIUS, seededRandom } from './layout'
import { FRAME_PRESETS, sanitize } from './presets'
import type { FrameSettings, RangeControl } from './types'

/** Every combination of min/max for each of a preset's range controls. */
function extremes(): FrameSettings[] {
  return FRAME_PRESETS.flatMap((preset) => {
    const ranges = preset.controls.filter((c): c is RangeControl => c.type === 'range')
    return Array.from({ length: 2 ** ranges.length }, (_, mask) =>
      sanitize({
        ...preset.defaults,
        ...Object.fromEntries(ranges.map((r, i) => [r.key, mask & (1 << i) ? r.max : r.min])),
      }),
    )
  })
}

describe('frame layout', () => {
  const cases = extremes()

  it('covers many setting combinations', () => {
    // At least min+max for every preset with controls.
    expect(cases.length).toBeGreaterThan(FRAME_PRESETS.length * 2)
  })

  it.each(cases.map((s) => [`${s.kind} t=${s.thickness} e=${s.effect}`, s] as const))(
    'keeps everything inside the circular safe area: %s',
    (_, s) => {
      const l = normalizedLayout(s)
      expect(l.effectOuter).toBeLessThanOrEqual(SAFE_RADIUS)
      expect(l.ringOuter).toBeLessThanOrEqual(l.effectOuter)
      expect(l.ringInner).toBeLessThanOrEqual(l.ringOuter)
      expect(l.photo).toBeLessThanOrEqual(l.ringInner)
      // The avatar always stays the hero: at least 60% of the circle's diameter.
      expect(l.photo).toBeGreaterThanOrEqual(0.3)
    },
  )

  it('fills the whole circle when there is no frame', () => {
    const none = FRAME_PRESETS.find((p) => p.kind === 'none')!.defaults
    expect(normalizedLayout(none).photo).toBe(SAFE_RADIUS)
  })

  it('scales linearly with size, so preview and export align', () => {
    for (const s of cases) {
      const a = pixelLayout(s, 400)
      const b = pixelLayout(s, 1080)
      for (const key of Object.keys(a) as (keyof typeof a)[]) {
        expect(b[key]).toBeCloseTo((a[key] * 1080) / 400, 9)
      }
    }
  })
})

describe('deterministic flames', () => {
  it('produces identical tongues every time', () => {
    expect(flameTongues()).toEqual(flameTongues())
  })

  it('keeps tongue heights within 60–100% of the reach', () => {
    for (const t of flameTongues()) {
      expect(t.height).toBeGreaterThanOrEqual(0.6)
      expect(t.height).toBeLessThanOrEqual(1)
    }
  })

  it('uses a repeatable PRNG', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const seqA = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(seqA)
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(Array.from({ length: 5 }, seededRandom(43))).not.toEqual(seqA)
  })
})
