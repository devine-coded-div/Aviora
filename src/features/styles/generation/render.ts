import type { MockEffect } from '../types'
import { applyMockEffect } from './effects'

/** Canvas glue for the mock provider: decode → apply effect → encode. Browser-only. */
export async function renderMockStyle(image: Blob, effect: MockEffect): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D is not available')
    ctx.drawImage(bitmap, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    applyMockEffect(pixels, effect)
    ctx.putImageData(pixels, 0, 0)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed'))), 'image/png'),
    )
  } finally {
    bitmap.close()
  }
}
