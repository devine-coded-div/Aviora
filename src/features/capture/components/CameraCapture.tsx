import { ArrowLeft, Camera, Loader2, RefreshCcw, ShieldCheck, SwitchCamera } from 'lucide-react'
import { useState } from 'react'
import { Button, Notice } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCamera } from '../hooks/useCamera'
import { CAMERA_ERROR_MESSAGES } from '../lib/messages'
import type { CameraErrorKind } from '../types'
import { SafeAreaOverlay } from './SafeAreaOverlay'

export interface CameraCaptureProps {
  onCaptured: (blob: Blob) => Promise<void> | void
  onBack: () => void
  onUpload: () => void
  /** Native camera via <input capture>, for browsers without getUserMedia. */
  onNativeCamera: () => void
}

const RETRYABLE: ReadonlySet<CameraErrorKind> = new Set([
  'permission-denied',
  'in-use',
  'overconstrained',
  'unknown',
])
const NATIVE_FALLBACK: ReadonlySet<CameraErrorKind> = new Set(['unsupported', 'insecure-context'])

export function CameraCapture({
  onCaptured,
  onBack,
  onUpload,
  onNativeCamera,
}: CameraCaptureProps) {
  const { state, videoRef, start, stop, switchCamera, capture } = useCamera()
  const [capturing, setCapturing] = useState(false)
  const [captureFailed, setCaptureFailed] = useState(false)

  async function takePhoto() {
    setCapturing(true)
    setCaptureFailed(false)
    try {
      const blob = await capture()
      stop()
      await onCaptured(blob)
    } catch {
      setCaptureFailed(true)
      setCapturing(false)
    }
  }

  function back() {
    stop()
    onBack()
  }

  // Explicit permission: explain first, request only when the user clicks.
  if (state.status === 'idle') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-(--radius-card) border border-border bg-surface p-6 text-center sm:p-8">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <p className="text-lg font-semibold">Allow camera access</p>
        <p className="text-sm text-pretty text-fg-muted">
          Your browser will ask for permission. The video stays on this device and the camera turns
          off as soon as you take your photo or leave this step.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={() => void start('user')}>
            <Camera aria-hidden="true" />
            Turn on camera
          </Button>
          <Button variant="ghost" onClick={back}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    const message = CAMERA_ERROR_MESSAGES[state.kind]
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Notice message={message}>
          {RETRYABLE.has(state.kind) && (
            <Button size="sm" variant="primary" onClick={() => void start('user')}>
              <RefreshCcw aria-hidden="true" />
              Try again
            </Button>
          )}
          {NATIVE_FALLBACK.has(state.kind) && (
            <Button size="sm" variant="primary" onClick={onNativeCamera}>
              <Camera aria-hidden="true" />
              Open camera app
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onUpload}>
            Upload a photo
          </Button>
        </Notice>
        <Button variant="ghost" className="self-center" onClick={back}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
      </div>
    )
  }

  const active = state.status === 'active'
  const mirrored = active ? state.facingMode === 'user' : true
  const nextFacing = active && state.facingMode === 'user' ? 'back' : 'front'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="relative aspect-square overflow-hidden rounded-(--radius-card) border border-border bg-surface">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Live camera preview"
          className={cn(
            'size-full object-cover',
            mirrored && '-scale-x-100',
            !active && 'invisible',
          )}
        />
        {!active && (
          <output className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-fg-muted">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            Waiting for camera… Allow access when your browser asks.
          </output>
        )}
        {active && <SafeAreaOverlay />}
      </div>

      {active && (
        <p className="text-center text-sm text-fg-muted">
          Keep your face inside the circle — that’s what shows on your profile.
        </p>
      )}

      {captureFailed && (
        <Notice message={{ title: 'Couldn’t take the photo', description: 'Please try again.' }} />
      )}

      <div className="grid grid-cols-3 items-center">
        <Button variant="ghost" className="justify-self-start" onClick={back}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <button
          type="button"
          onClick={() => void takePhoto()}
          disabled={!active || capturing}
          aria-label="Take photo"
          className="justify-self-center rounded-full border-4 border-fg p-1 ring-offset-canvas transition hover:bg-fg/10 disabled:opacity-40"
        >
          <span className="block size-14 rounded-full bg-fg" />
        </button>
        {active && state.canSwitch ? (
          <Button
            variant="secondary"
            className="size-11 justify-self-end px-0"
            onClick={switchCamera}
            aria-label={`Switch to ${nextFacing} camera`}
          >
            <SwitchCamera aria-hidden="true" />
          </Button>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
