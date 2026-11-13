import { describe, expect, it } from 'vitest'
import {
  adjustColor,
  applyMockEffect,
  pixelate,
  posterize,
  tint,
  type PixelBuffer,
} from './effects'

function buffer(width: number, height: number, pixels: number[][]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  pixels.forEach(([r, g, b], i) => data.set([r!, g!, b!, 255], i * 4))
  return { data, width, height }
}
const px = (buf: PixelBuffer, i: number) => Array.from(buf.data.slice(i * 4, i * 4 + 3))

describe('mock image effects', () => {
  it('leaves pixels unchanged with neutral settings', () => {
    const buf = buffer(1, 1, [[10, 120, 240]])
    adjustColor(buf, { saturation: 1, contrast: 1, brightness: 1 })
    expect(px(buf, 0)).toEqual([10, 120, 240])
  })

  it('desaturates to grey at saturation 0', () => {
    const buf = buffer(1, 1, [[200, 50, 50]])
    adjustColor(buf, { saturation: 0, contrast: 1, brightness: 1 })
    const [r, g, b] = px(buf, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('posterizes to the requested number of levels', () => {
    const buf = buffer(4, 1, [
      [0, 0, 0],
      [60, 60, 60],
      [140, 140, 140],
      [255, 255, 255],
    ])
    posterize(buf, 2)
    expect([0, 1, 2, 3].map((i) => px(buf, i)[0])).toEqual([0, 0, 255, 255])
  })

  it('pixelates by averaging blocks', () => {
    const buf = buffer(2, 1, [
      [0, 0, 0],
      [100, 200, 50],
    ])
    pixelate(buf, 1)
    expect(px(buf, 0)).toEqual([50, 100, 25])
    expect(px(buf, 1)).toEqual([50, 100, 25])
  })

  it('tints towards a colour by the given amount and never touches alpha', () => {
    const buf = buffer(1, 1, [[0, 0, 0]])
    tint(buf, { r: 200, g: 100, b: 0, amount: 0.5 })
    expect(px(buf, 0)).toEqual([100, 50, 0])
    expect(buf.data[3]).toBe(255)
  })

  it('is deterministic for the same input', () => {
    const make = () =>
      buffer(2, 2, [
        [10, 20, 30],
        [200, 100, 50],
        [90, 90, 90],
        [255, 0, 128],
      ])
    const a = make()
    const b = make()
    const effect = { saturation: 1.4, contrast: 1.2, brightness: 1.05, posterize: 5, pixelate: 1 }
    applyMockEffect(a, effect)
    applyMockEffect(b, effect)
    expect(a.data).toEqual(b.data)
  })
})
