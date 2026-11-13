import { useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { FILE_INPUT_ACCEPT } from '../constants'
import { PhotoError } from '../lib/image'
import { preparePhoto } from '../lib/preparePhoto'
import { usePhotoStore } from '../store'
import type { PhotoErrorKind, PhotoSource } from '../types'
import { CameraCapture } from './CameraCapture'
import { CropResult } from './CropResult'
import { PhotoCropper } from './PhotoCropper'
import { PhotoReview } from './PhotoReview'
import { SourcePicker } from './SourcePicker'
import { StepHeading } from './StepHeading'

type Step = 'source' | 'camera' | 'review' | 'crop' | 'done'

const STEP_COPY: Record<Step, { title: string; description: string }> = {
  source: {
    title: 'Add your photo',
    description: 'A well-lit, front-facing photo works best.',
  },
  camera: {
    title: 'Take a selfie',
    description: 'Look at the camera and centre your face in the circle.',
  },
  review: { title: 'Happy with this one?', description: 'Retake it or continue to cropping.' },
  crop: {
    title: 'Crop your photo',
    description: 'Fit your face inside the circle — that’s what profile pictures show.',
  },
  done: {
    title: 'Looking good',
    description: 'Here’s your square crop and how it reads as a circle.',
  },
}

const PROGRESS = ['Photo', 'Crop', 'Style', 'Frame', 'Download'] as const

function progressIndex(step: Step) {
  return step === 'crop' || step === 'done' ? 1 : 0
}

/** Orchestrates capture/upload → review → crop. All work happens in the browser. */
export function CaptureFlow() {
  const original = usePhotoStore((s) => s.original)
  const cropSettings = usePhotoStore((s) => s.crop)
  const cropped = usePhotoStore((s) => s.cropped)
  const setOriginal = usePhotoStore((s) => s.setOriginal)
  const setCrop = usePhotoStore((s) => s.setCrop)
  const clearCropped = usePhotoStore((s) => s.clearCropped)
  const reset = usePhotoStore((s) => s.reset)

  const [step, setStepState] = useState<Step>(() =>
    cropped ? 'done' : original ? 'crop' : 'source',
  )
  const [moved, setMoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState<PhotoErrorKind | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nativeCameraRef = useRef<HTMLInputElement>(null)

  function goTo(next: Step) {
    setMoved(true)
    setStepState(next)
  }

  async function acceptFile(file: Blob & { name?: string }, source: PhotoSource) {
    setBusy(true)
    setPhotoError(null)
    try {
      const photo = await preparePhoto(file, source)
      setOriginal(photo)
      goTo(source === 'camera' ? 'review' : 'crop')
    } catch (error) {
      setPhotoError(error instanceof PhotoError ? error.kind : 'decode-failed')
      goTo('source')
    } finally {
      setBusy(false)
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>, source: PhotoSource) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file
    if (file) void acceptFile(file, source)
  }

  function startOver() {
    reset()
    setPhotoError(null)
    goTo('source')
  }

  const copy = STEP_COPY[step]
  const current = progressIndex(step)

  return (
    <div className="flex flex-col gap-8">
      <ol
        aria-label="Progress"
        className="flex items-center justify-center gap-2 text-xs sm:gap-3 sm:text-sm"
      >
        {PROGRESS.map((label, index) => (
          <li
            key={label}
            aria-current={index === current ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2',
              index === current ? 'font-medium text-fg' : 'text-fg-subtle',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-full border text-[0.7rem]',
                index < current && 'border-accent bg-accent/15 text-accent',
                index === current && 'border-accent-strong bg-accent-strong text-white',
                index > current && 'border-border',
              )}
            >
              {index + 1}
            </span>
            <span className={cn(index !== current && 'hidden sm:inline')}>{label}</span>
            {index < current && <span className="sr-only">(done)</span>}
          </li>
        ))}
      </ol>

      <StepHeading focusOnMount={moved} key={step} description={copy.description}>
        {copy.title}
      </StepHeading>

      {step === 'source' && (
        <SourcePicker
          busy={busy}
          error={photoError}
          onCamera={() => {
            setPhotoError(null)
            goTo('camera')
          }}
          onBrowse={() => fileInputRef.current?.click()}
          onFile={(file) => void acceptFile(file, 'upload')}
        />
      )}

      {step === 'camera' && (
        <CameraCapture
          onCaptured={(blob) => acceptFile(blob, 'camera')}
          onBack={() => goTo('source')}
          onUpload={() => {
            goTo('source')
            fileInputRef.current?.click()
          }}
          onNativeCamera={() => nativeCameraRef.current?.click()}
        />
      )}

      {step === 'review' && original && (
        <PhotoReview
          photo={original}
          onRetake={() => {
            reset()
            goTo('camera')
          }}
          onAccept={() => goTo('crop')}
        />
      )}

      {step === 'crop' && original && (
        <PhotoCropper
          // Remount for a new photo so position/zoom start fresh.
          key={original.url}
          photo={original}
          initial={cropSettings}
          onApply={(settings, result) => {
            setCrop(settings, result)
            goTo('done')
          }}
          onChangePhoto={startOver}
        />
      )}

      {step === 'done' && cropped && (
        <CropResult
          cropped={cropped}
          onAdjust={() => {
            clearCropped()
            goTo('crop')
          }}
          onStartOver={startOver}
        />
      )}

      {/* Hidden inputs, opened programmatically from the buttons above. */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        hidden
        aria-label="Choose a photo"
        data-testid="photo-file-input"
        onChange={(event) => onInputChange(event, 'upload')}
      />
      <input
        ref={nativeCameraRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        aria-label="Take a photo with your camera app"
        data-testid="native-camera-input"
        onChange={(event) => onInputChange(event, 'upload')}
      />
    </div>
  )
}
