import type { MockEffect } from '../types'

/** Minimal ImageData shape so effects can be tested without a canvas. */
export interface PixelBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}

const LUMA = [0.2126, 0.7152, 0.0722] as const

/** Saturation, contrast and brightness in one pass. Mutates `buf`. */
export function adjustColor(
  buf: PixelBuffer,
  { saturation, contrast, brightness }: Pick<MockEffect, 'saturation' | 'contrast' | 'brightness'>,
): void {
  const d = buf.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]!
    let g = d[i + 1]!
    let b = d[i + 2]!
    const gray = LUMA[0] * r + LUMA[1] * g + LUMA[2] * b
    r = gray + (r - gray) * saturation
    g = gray + (g - gray) * saturation
    b = gray + (b - gray) * saturation
    r = ((r - 128) * contrast + 128) * brightness
    g = ((g - 128) * contrast + 128) * brightness
    b = ((b - 128) * contrast + 128) * brightness
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
}

/** Reduce each channel to `levels` evenly spaced values. Mutates `buf`. */
export function posterize(buf: PixelBuffer, levels: number): void {
  const n = Math.max(2, Math.min(255, Math.round(levels)))
  const step = 255 / (n - 1)
  const d = buf.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i]! / step) * step
    d[i + 1] = Math.round(d[i + 1]! / step) * step
    d[i + 2] = Math.round(d[i + 2]! / step) * step
  }
}

/** Blend every pixel towards a colour. Mutates `buf`. */
export function tint(buf: PixelBuffer, { r, g, b, amount }: NonNullable<MockEffect['tint']>): void {
  const a = Math.max(0, Math.min(1, amount))
  const d = buf.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i]! + (r - d[i]!) * a
    d[i + 1] = d[i + 1]! + (g - d[i + 1]!) * a
    d[i + 2] = d[i + 2]! + (b - d[i + 2]!) * a
  }
}

/** Replace each block with its average colour, giving `cells` blocks across. Mutates `buf`. */
export function pixelate(buf: PixelBuffer, cells: number): void {
  const { width, height, data } = buf
  const size = Math.max(1, Math.round(width / Math.max(1, cells)))
  for (let by = 0; by < height; by += size) {
    for (let bx = 0; bx < width; bx += size) {
      const maxY = Math.min(by + size, height)
      const maxX = Math.min(bx + size, width)
      let r = 0
      let g = 0
      let b = 0
      let count = 0
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const i = (y * width + x) * 4
          r += data[i]!
          g += data[i + 1]!
          b += data[i + 2]!
          count++
        }
      }
      r /= count
      g /= count
      b /= count
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const i = (y * width + x) * 4
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
        }
      }
    }
  }
}

/** Apply a style's mock effect in a fixed order. Mutates `buf`. */
export function applyMockEffect(buf: PixelBuffer, effect: MockEffect): void {
  if (effect.pixelate) pixelate(buf, effect.pixelate)
  adjustColor(buf, effect)
  if (effect.tint) tint(buf, effect.tint)
  if (effect.posterize) posterize(buf, effect.posterize)
}
