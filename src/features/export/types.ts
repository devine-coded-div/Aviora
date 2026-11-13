export type ExportFormat = 'png' | 'jpeg'

export const FORMAT_INFO: Record<
  ExportFormat,
  { mime: string; ext: string; label: string; hint: string }
> = {
  png: {
    mime: 'image/png',
    ext: 'png',
    label: 'PNG',
    hint: 'Lossless, best quality. Larger file.',
  },
  jpeg: {
    mime: 'image/jpeg',
    ext: 'jpg',
    label: 'JPEG',
    hint: 'Smaller file. Slight compression.',
  },
}

export type ExportErrorKind =
  'source-missing' | 'canvas-unavailable' | 'encode-failed' | 'size-mismatch' | 'download-failed'

export class ExportError extends Error {
  readonly kind: ExportErrorKind
  constructor(kind: ExportErrorKind, options?: { cause?: unknown }) {
    super(kind, options)
    this.name = 'ExportError'
    this.kind = kind
  }
}

export interface ExportedImage {
  blob: Blob
  format: ExportFormat
  width: number
  height: number
  fileName: string
}
