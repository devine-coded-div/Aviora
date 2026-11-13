import { Notice } from '@/components/ui'
import { Camera, ImageUp, Loader2, Lock } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { cn } from '@/lib/cn'
import { PHOTO_ERROR_MESSAGES } from '../lib/messages'
import type { PhotoErrorKind } from '../types'

export interface SourcePickerProps {
  onCamera: () => void
  onBrowse: () => void
  onFile: (file: File) => void
  busy: boolean
  error: PhotoErrorKind | null
}

/** Entry point: take a selfie or upload (button or drag-and-drop). */
export function SourcePicker({ onCamera, onBrowse, onFile, busy, error }: SourcePickerProps) {
  const [dragging, setDragging] = useState(false)

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDragging(true)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const optionClass =
    'group border-border bg-surface hover:border-accent/60 hover:bg-surface-raised flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-(--radius-card) border p-6 text-center transition-colors disabled:pointer-events-none disabled:opacity-60'

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" className={optionClass} onClick={onCamera} disabled={busy}>
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Camera className="size-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">Take a selfie</span>
          <span className="text-sm text-fg-muted">Use your front or back camera</span>
        </button>

        <div
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="rounded-(--radius-card)"
        >
          <button
            type="button"
            className={cn(optionClass, dragging && 'border-dashed border-accent bg-accent/10')}
            onClick={onBrowse}
            disabled={busy}
          >
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              {busy ? (
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
              ) : (
                <ImageUp className="size-6" aria-hidden="true" />
              )}
            </span>
            <span className="text-lg font-semibold">
              {busy ? 'Opening photo…' : 'Upload a photo'}
            </span>
            <span className="text-sm text-fg-muted">
              <span className="hidden sm:inline">Drop a file here or browse · </span>JPG, PNG or
              WebP, up to 25 MB
            </span>
          </button>
        </div>
      </div>

      {error && <Notice message={PHOTO_ERROR_MESSAGES[error]} />}

      <p className="flex items-center justify-center gap-2 text-sm text-fg-muted">
        <Lock className="size-4" aria-hidden="true" />
        Your photo stays on this device. Nothing is uploaded.
      </p>
    </div>
  )
}
