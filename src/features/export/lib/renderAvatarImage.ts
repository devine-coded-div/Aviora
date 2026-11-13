import { drawAvatar, type FrameSettings, type SourceImage } from '@/features/frames'
import { ExportError, FORMAT_INFO, type ExportFormat } from '../types'

export interface RenderOptions {
  settings: FrameSettings
  source: SourceImage | null
  size: number
  format: ExportFormat
  /** JPEG quality 0–1 (ignored for PNG). */
  quality: number
}

/**
 * Render the final square image with the same `drawAvatar` the editor preview uses, so the
 * export matches what the user saw. The background is opaque, so PNG and JPEG are identical in
 * composition (JPEG only adds compression).
 */
export async function renderAvatarImage({
  settings,
  source,
  size,
  format,
  quality,
}: RenderOptions): Promise<Blob> {
  if (!source) throw new ExportError('source-missing')
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExportError('canvas-unavailable')
  drawAvatar(ctx, size, settings, source)

  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, FORMAT_INFO[format].mime, format === 'jpeg' ? quality : undefined)
    } catch {
      // Tainted canvases or memory pressure throw here; reported as an encode failure below.
      resolve(null)
    }
  })
  if (!blob || blob.size === 0) throw new ExportError('encode-failed')
  if (blob.type && blob.type !== FORMAT_INFO[format].mime) throw new ExportError('encode-failed')
  return blob
}

/** Decode the encoded file and read its real pixel dimensions. */
export async function readImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}
