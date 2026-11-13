import { DEFAULT_EXPORT_SIZE_PX } from '@/lib/constants'

/** MIME types we always accept. HEIC/HEIF are attempted and rejected only if the browser can't decode them. */
export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const

/** Value for the file input's `accept` attribute. */
export const FILE_INPUT_ACCEPT = [
  ...ACCEPTED_MIME_TYPES,
  ...HEIC_MIME_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
].join(',')

export const MAX_FILE_BYTES = 25 * 1024 * 1024
/** Decoding beyond this risks exhausting memory on phones (a 50 MP RGBA bitmap is ~200 MB). */
export const MAX_PIXELS = 50_000_000
/** Smallest side we accept at all. */
export const MIN_SIDE_PX = 256
/** Crops smaller than this are upscaled to the output size and flagged as low resolution. */
export const LOW_RES_CROP_PX = 540

export const CROP_OUTPUT_SIZE_PX = DEFAULT_EXPORT_SIZE_PX
export const CROP_MIN_ZOOM = 1
export const CROP_MAX_ZOOM = 4

export const JPEG_QUALITY = 0.92
