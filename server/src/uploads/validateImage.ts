import sharp, { type Metadata } from 'sharp'

export const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'] as const
export const MIN_SIDE = 256
export const MAX_SIDE = 4096
/** Size of the normalized image handed to providers. */
export const NORMALIZED_SIZE = 1024

export type UploadErrorCode =
  | 'missing-image'
  | 'file-too-large'
  | 'unsupported-type'
  | 'image-too-small'
  | 'image-too-large'
  | 'animated-image'
  | 'corrupt-image'

export class UploadError extends Error {
  readonly code: UploadErrorCode
  constructor(code: UploadErrorCode, message: string) {
    super(message)
    this.name = 'UploadError'
    this.code = code
  }
}

export interface NormalizedImage {
  body: Buffer
  mime: 'image/png'
  width: number
  height: number
}

/**
 * Validate an uploaded file by decoding it (never trusting its name or declared MIME type),
 * then re-encode it as a square PNG. Re-encoding drops all metadata — EXIF, GPS location,
 * camera details — and neutralizes anything hidden in the original container.
 */
export async function validateAndNormalize(input: Buffer): Promise<NormalizedImage> {
  if (input.length === 0) throw new UploadError('missing-image', 'The image file is empty.')

  let meta: Metadata
  try {
    // limitInputPixels rejects decompression bombs before decoding pixel data.
    meta = await sharp(input, { limitInputPixels: MAX_SIDE * MAX_SIDE, failOn: 'error' }).metadata()
  } catch {
    throw new UploadError('corrupt-image', 'The file could not be read as an image.')
  }

  if (!meta.format || !(ACCEPTED_FORMATS as readonly string[]).includes(meta.format)) {
    throw new UploadError('unsupported-type', 'Use a JPG, PNG or WebP image.')
  }
  if ((meta.pages ?? 1) > 1)
    throw new UploadError('animated-image', 'Animated images are not supported.')

  const { width = 0, height = 0 } = meta
  if (Math.min(width, height) < MIN_SIDE) {
    throw new UploadError(
      'image-too-small',
      `The image must be at least ${MIN_SIDE}×${MIN_SIDE} pixels.`,
    )
  }
  if (Math.max(width, height) > MAX_SIDE) {
    throw new UploadError(
      'image-too-large',
      `The image must be at most ${MAX_SIDE}×${MAX_SIDE} pixels.`,
    )
  }

  try {
    const body = await sharp(input, { limitInputPixels: MAX_SIDE * MAX_SIDE, failOn: 'error' })
      .rotate() // apply EXIF orientation before metadata is dropped
      .resize(NORMALIZED_SIZE, NORMALIZED_SIZE, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
    return { body, mime: 'image/png', width: NORMALIZED_SIZE, height: NORMALIZED_SIZE }
  } catch {
    throw new UploadError('corrupt-image', 'The file could not be read as an image.')
  }
}
