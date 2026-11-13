import { JPEG_QUALITY, LOW_RES_CROP_PX, MAX_PIXELS, MIN_SIDE_PX } from '../constants'
import type { PhotoErrorKind, PixelArea } from '../types'

export class PhotoError extends Error {
  readonly kind: PhotoErrorKind
  constructor(kind: PhotoErrorKind) {
    super(kind)
    this.name = 'PhotoError'
    this.kind = kind
  }
}

/**
 * Decode an image from a URL. Browsers apply EXIF orientation automatically for <img>,
 * so width/height are the upright dimensions.
 */
export async function decodeImage(url: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  try {
    await img.decode()
  } catch {
    throw new PhotoError('decode-failed')
  }
  if (!img.naturalWidth || !img.naturalHeight) throw new PhotoError('decode-failed')
  return img
}

/** Dimension checks done after decoding. */
export function checkDimensions(width: number, height: number): PhotoErrorKind | null {
  if (Math.min(width, height) < MIN_SIDE_PX) return 'too-small'
  if (width * height > MAX_PIXELS) return 'too-many-pixels'
  return null
}

export function isLowResolutionCrop(area: Pick<PixelArea, 'width'>): boolean {
  return area.width < LOW_RES_CROP_PX
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      type,
      JPEG_QUALITY,
    )
  })
}

function create2dCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

/** Grab the current camera frame at full sensor resolution. Mirrors front-camera shots to match the preview. */
export async function captureVideoFrame(video: HTMLVideoElement, mirror: boolean): Promise<Blob> {
  const { videoWidth: w, videoHeight: h } = video
  if (!w || !h) throw new Error('Camera is not ready yet')
  const { canvas, ctx } = create2dCanvas(w, h)
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, w, h)
  return canvasToBlob(canvas)
}

/** Render the cropped square from the original image at the output size. */
export async function renderCroppedSquare(
  image: CanvasImageSource,
  area: PixelArea,
  size: number,
): Promise<Blob> {
  const { canvas, ctx } = create2dCanvas(size, size)
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size)
  return canvasToBlob(canvas)
}
