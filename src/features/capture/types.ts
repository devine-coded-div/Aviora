export type PhotoSource = 'camera' | 'upload'

/** The user's original photo, untouched. Lives only in memory as a Blob + object URL. */
export interface SourcePhoto {
  blob: Blob
  url: string
  width: number
  height: number
  source: PhotoSource
  /** Original file name for uploads; generated for camera captures. */
  name: string
}

/** A rectangle in pixels of the original image (react-easy-crop's `croppedAreaPixels`). */
export interface PixelArea {
  x: number
  y: number
  width: number
  height: number
}

/** Everything needed to restore the cropper exactly where the user left it. */
export interface CropSettings {
  area: PixelArea
  position: { x: number; y: number }
  zoom: number
}

/** The square crop rendered from the original. Input for styles (Phase 3) and export (Phase 5). */
export interface CroppedPhoto {
  blob: Blob
  url: string
  size: number
  /** True when the crop was upscaled from a small region and may look soft. */
  lowResolution: boolean
}

export type PhotoErrorKind =
  | 'empty'
  | 'unsupported-type'
  | 'heic-unsupported'
  | 'too-large'
  | 'too-small'
  | 'too-many-pixels'
  | 'decode-failed'

export type CameraErrorKind =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'overconstrained'
  | 'unknown'

export type FacingMode = 'user' | 'environment'
