import { describe, expect, it } from 'vitest'
import { pixelLayout } from '../layout'
import { FRAME_PRESETS, getPreset, sanitize } from '../presets'
import type { FrameSettings } from '../types'
import { drawAvatar, withAlpha, type SourceImage } from './drawAvatar'

type Call = { op: string; args: unknown[] }

/** A fake 2D context that records every method call and property write. */
function recorder() {
  const calls: Call[] = []
  const gradient = (op: string, args: unknown[]) => ({
    addColorStop: (...a: unknown[]) => calls.push({ op: `${op}.addColorStop`, args: a }),
    args,
  })
  const props: Record<string, unknown> = {}
  const ctx = new Proxy(
    {},
    {
      get(_, prop: string) {
        // Properties read back (e.g. `globalAlpha *= 0.85`) return the last value written.
        if (prop in props) return props[prop]
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return (...args: unknown[]) => {
            calls.push({ op: prop, args })
            return gradient(prop, args)
          }
        }
        return (...args: unknown[]) => calls.push({ op: prop, args })
      },
      set(_, prop: string, value: unknown) {
        props[prop] = value
        calls.push({ op: `set ${prop}`, args: [typeof value === 'object' ? '<gradient>' : value] })
        return true
      },
    },
  ) as CanvasRenderingContext2D
  return { ctx, calls }
}

const photo: SourceImage = { image: {} as CanvasImageSource, width: 1200, height: 900 }

function draw(settings: FrameSettings, size: number) {
  const { ctx, calls } = recorder()
  drawAvatar(ctx, size, settings, photo)
  return calls
}

/** Arguments that are lengths (scale with size) for each geometric operation. */
const LENGTH_ARGS: Record<string, number[]> = {
  arc: [0, 1, 2],
  moveTo: [0, 1],
  quadraticCurveTo: [0, 1, 2, 3],
  fillRect: [0, 1, 2, 3],
  clearRect: [0, 1, 2, 3],
  createLinearGradient: [0, 1, 2, 3],
  createRadialGradient: [0, 1, 2, 3, 4, 5],
  drawImage: [5, 6, 7, 8],
  'set lineWidth': [0],
  'set shadowBlur': [0],
}

describe('drawAvatar', () => {
  it.each(FRAME_PRESETS.map((p) => [p.kind, p.defaults] as const))(
    'is deterministic for %s',
    (_, settings) => {
      expect(draw(settings, 800)).toEqual(draw(settings, 800))
    },
  )

  it.each(FRAME_PRESETS.map((p) => [p.kind, p.defaults] as const))(
    'scales every coordinate exactly with size for %s',
    (_, settings) => {
      const round = (calls: Call[]) =>
        calls.map((c) => ({
          op: c.op,
          args: c.args.map((v) => (typeof v === 'number' ? Number(v.toFixed(6)) : v)),
        }))
      const small = draw(settings, 500)
      // Doubling the size should double every length argument and leave everything else alone.
      const expected = small.map((call) => ({
        op: call.op,
        args: call.args.map((v, j) =>
          typeof v === 'number' && (LENGTH_ARGS[call.op] ?? []).includes(j) ? v * 2 : v,
        ),
      }))
      expect(round(draw(settings, 1000))).toEqual(round(expected))
    },
  )

  it('fills the background first, then clips the photo to the photo circle', () => {
    const settings = getPreset('solid').defaults
    const calls = draw(settings, 1000)
    const firstFill = calls.findIndex((c) => c.op === 'fillRect')
    expect(calls[firstFill - 1]).toEqual({ op: 'set fillStyle', args: [settings.background] })
    const clip = calls.findIndex((c) => c.op === 'clip')
    const clipArc = calls.slice(0, clip).findLast((c) => c.op === 'arc')!
    expect(clipArc.args.slice(0, 3)).toEqual([500, 500, pixelLayout(settings, 1000).photo])
  })

  it('centre-crops non-square photos into the circle', () => {
    const settings = getPreset('none').defaults
    const drawImage = draw(settings, 1000).find((c) => c.op === 'drawImage')!
    // 1200×900 source → central 900×900, drawn into the full 1000 px circle bounds.
    expect(drawImage.args.slice(1)).toEqual([150, 0, 900, 900, 0, 0, 1000, 1000])
  })

  it('draws no ring for "No frame"', () => {
    const calls = draw(getPreset('none').defaults, 1000)
    expect(calls.filter((c) => c.op === 'fill')).toHaveLength(0)
    expect(calls.filter((c) => c.op === 'stroke')).toHaveLength(0)
  })

  it('applies the chosen opacity to the frame layer', () => {
    const calls = draw({ ...getPreset('solid').defaults, opacity: 0.4 }, 1000)
    expect(calls).toContainEqual({ op: 'set globalAlpha', args: [0.4] })
  })

  it('keeps every flame point inside the safe circle at maximum settings', () => {
    const max: FrameSettings = sanitize({ ...getPreset('flame').defaults, effect: 1, thickness: 1 })
    const points = draw(max, 1000)
      .filter((c) => c.op === 'moveTo' || c.op === 'quadraticCurveTo')
      .map((c) => {
        const a = c.args as number[]
        return c.op === 'moveTo' ? [a[0]!, a[1]!] : [a[2]!, a[3]!]
      })
    expect(points.length).toBeGreaterThan(0)
    const furthest = Math.max(...points.map(([x, y]) => Math.hypot(x! - 500, y! - 500)))
    expect(furthest).toBeLessThanOrEqual(500)
  })

  it('keeps the neon glow inside the safe circle at maximum settings', () => {
    const max: FrameSettings = sanitize({ ...getPreset('neon').defaults, effect: 1, thickness: 1 })
    const blur = draw(max, 1000).find((c) => c.op === 'set shadowBlur')?.args[0] as number
    // A Gaussian glow is visible to about 1.5× shadowBlur.
    expect(pixelLayout(max, 1000).ringOuter + blur * 1.5).toBeLessThanOrEqual(500)
  })
})

describe('withAlpha', () => {
  it('converts hex to rgba', () => {
    expect(withAlpha('#ff8000', 0.5)).toBe('rgba(255,128,0,0.5)')
  })
})
