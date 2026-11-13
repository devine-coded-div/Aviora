import { Check, ImageUp, Loader2, Minus, Plus, RotateCcw } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Button, Notice } from '@/components/ui'
import { CROP_MAX_ZOOM, CROP_MIN_ZOOM, CROP_OUTPUT_SIZE_PX } from '../constants'
import { decodeImage, isLowResolutionCrop, renderCroppedSquare } from '../lib/image'
import type { CroppedPhoto, CropSettings, SourcePhoto } from '../types'
import { SafeAreaOverlay } from './SafeAreaOverlay'

export interface PhotoCropperProps {
  photo: SourcePhoto
  initial: CropSettings | null
  onApply: (settings: CropSettings, cropped: CroppedPhoto) => void
  onChangePhoto: () => void
}

const ZOOM_STEP = 0.1
const clampZoom = (z: number) => Math.min(CROP_MAX_ZOOM, Math.max(CROP_MIN_ZOOM, z))

/** Square crop with a circular safe-area guide. Rendering happens locally on a canvas. */
export function PhotoCropper({ photo, initial, onApply, onChangePhoto }: PhotoCropperProps) {
  const helpId = useId()
  const zoomId = useId()
  const [position, setPosition] = useState<Point>(initial?.position ?? { x: 0, y: 0 })
  const [zoom, setZoom] = useState(initial?.zoom ?? 1)
  const [area, setArea] = useState<Area | null>(initial?.area ?? null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  async function apply() {
    if (!area) return
    setBusy(true)
    setFailed(false)
    try {
      const image = await decodeImage(photo.url)
      const blob = await renderCroppedSquare(image, area, CROP_OUTPUT_SIZE_PX)
      onApply(
        { area, position, zoom },
        {
          blob,
          url: URL.createObjectURL(blob),
          size: CROP_OUTPUT_SIZE_PX,
          lowResolution: isLowResolutionCrop(area),
        },
      )
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  function reset() {
    setPosition({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="relative aspect-square touch-none overflow-hidden rounded-(--radius-card) border border-border bg-surface">
        <Cropper
          image={photo.url}
          crop={position}
          zoom={zoom}
          aspect={1}
          minZoom={CROP_MIN_ZOOM}
          maxZoom={CROP_MAX_ZOOM}
          objectFit="cover"
          showGrid={false}
          onCropChange={setPosition}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          mediaProps={{ alt: 'You, positioned for cropping' }}
          cropperProps={{
            role: 'group',
            'aria-label': 'Crop area',
            'aria-describedby': helpId,
          }}
          classes={{ cropAreaClassName: 'border-0! shadow-none! focus-visible:outline-accent' }}
        />
        <SafeAreaOverlay />
      </div>

      <p id={helpId} className="text-center text-sm text-fg-muted">
        Drag to reposition (or focus the photo and use the arrow keys). Pinch, scroll or use the
        slider to zoom.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="size-11 px-0"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP * 2))}
          disabled={zoom <= CROP_MIN_ZOOM}
        >
          <Minus aria-hidden="true" />
        </Button>
        <label htmlFor={zoomId} className="sr-only">
          Zoom
        </label>
        <input
          id={zoomId}
          type="range"
          min={CROP_MIN_ZOOM}
          max={CROP_MAX_ZOOM}
          step={ZOOM_STEP}
          value={zoom}
          onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
          aria-valuetext={`${Math.round(zoom * 100)}%`}
          className="h-11 flex-1 cursor-pointer accent-accent-strong"
        />
        <Button
          variant="ghost"
          className="size-11 px-0"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP * 2))}
          disabled={zoom >= CROP_MAX_ZOOM}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      {failed && (
        <Notice
          message={{
            title: 'Couldn’t crop the photo',
            description: 'Please try again, or choose a different photo.',
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={reset} disabled={busy}>
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
        <Button variant="primary" onClick={() => void apply()} disabled={!area || busy}>
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {busy ? 'Cropping…' : 'Apply crop'}
        </Button>
      </div>
      <Button variant="ghost" className="self-center" onClick={onChangePhoto} disabled={busy}>
        <ImageUp aria-hidden="true" />
        Use a different photo
      </Button>
    </div>
  )
}
