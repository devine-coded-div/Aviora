import { describe, expect, it } from 'vitest'
import { DEFAULT_FRAME, FRAME_PRESETS, getPreset, sanitize } from './presets'

describe('frame presets', () => {
  it('includes every required frame type exactly once', () => {
    const kinds = FRAME_PRESETS.map((p) => p.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
    expect(kinds).toEqual(
      expect.arrayContaining(['flame', 'dark', 'solid', 'gradient', 'neon', 'minimal', 'none']),
    )
  })

  it('has defaults that already satisfy their own control ranges', () => {
    for (const preset of FRAME_PRESETS) {
      expect(preset.defaults.kind).toBe(preset.kind)
      expect(sanitize(preset.defaults)).toEqual(preset.defaults)
    }
  })

  it('offers colour and opacity controls on every ring preset, and thickness where a ring exists', () => {
    for (const preset of FRAME_PRESETS.filter((p) => p.kind !== 'none')) {
      const keys = preset.controls.map((c) => c.key)
      expect(keys).toEqual(expect.arrayContaining(['color', 'thickness', 'opacity', 'background']))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('exposes effect controls only for presets that use them', () => {
    const withEffect = FRAME_PRESETS.filter((p) => p.controls.some((c) => c.key === 'effect'))
    expect(withEffect.map((p) => p.kind).sort()).toEqual(['dark', 'flame', 'neon'])
    expect(getPreset('gradient').controls.some((c) => c.key === 'angle')).toBe(true)
  })

  it('uses valid hex colours for every swatch', () => {
    const swatches = FRAME_PRESETS.flatMap((p) =>
      p.controls.flatMap((c) => (c.type === 'color' ? c.swatches.map((s) => s.value) : [])),
    )
    expect(swatches.length).toBeGreaterThan(0)
    expect(swatches.filter((v) => !/^#[0-9a-f]{6}$/i.test(v))).toEqual([])
  })

  it('defaults to neon', () => {
    expect(DEFAULT_FRAME.kind).toBe('neon')
  })
})

describe('sanitize', () => {
  it('clamps numbers to the preset’s ranges', () => {
    const s = sanitize({
      ...getPreset('neon').defaults,
      thickness: 5,
      opacity: -1,
      effect: Number.NaN,
    })
    expect(s.thickness).toBe(0.04)
    expect(s.opacity).toBe(0.2)
    expect(s.effect).toBe(getPreset('neon').defaults.effect)
  })

  it('replaces malformed colours with the preset default', () => {
    const s = sanitize({ ...getPreset('solid').defaults, color: 'red', background: '#12345' })
    expect(s.color).toBe(getPreset('solid').defaults.color)
    expect(s.background).toBe(getPreset('solid').defaults.background)
  })

  it('accepts custom hex colours', () => {
    expect(sanitize({ ...getPreset('solid').defaults, color: '#123ABC' }).color).toBe('#123ABC')
  })
})
