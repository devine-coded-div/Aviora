import { ArrowRight, Crop, ImageUp, Sparkles } from 'lucide-react'
import { Button, Notice } from '@/components/ui'
import type { CroppedPhoto } from '../types'

export interface CropResultProps {
  cropped: CroppedPhoto
  onContinue: () => void
  onAdjust: () => void
  onStartOver: () => void
}

const previews = [
  { label: 'Profile', className: 'size-28 sm:size-32' },
  { label: 'Feed', className: 'size-12' },
  { label: 'Comment', className: 'size-8' },
] as const

export function CropResult({ cropped, onContinue, onAdjust, onStartOver }: CropResultProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <figure className="flex flex-col gap-2">
          <img
            src={cropped.url}
            alt="Your square crop"
            className="aspect-square w-full rounded-(--radius-card) border border-border object-cover"
          />
          <figcaption className="text-center text-xs text-fg-muted">
            Square · {cropped.size} × {cropped.size}
          </figcaption>
        </figure>

        <div className="flex flex-col items-center gap-5 rounded-(--radius-card) border border-border bg-surface p-5">
          <p className="text-sm font-medium">How it looks as a circle</p>
          <ul className="flex items-end gap-5 sm:flex-col sm:items-center">
            {previews.map((p) => (
              <li key={p.label} className="flex flex-col items-center gap-1.5">
                <img
                  src={cropped.url}
                  alt=""
                  className={`${p.className} rounded-full object-cover`}
                />
                <span className="text-xs text-fg-muted">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {cropped.lowResolution && (
        <Notice
          tone="warning"
          message={{
            title: 'This crop is quite small',
            description:
              'You zoomed into a small part of the photo, so the result may look soft. Zoom out a little or use a higher-resolution photo for the sharpest avatar.',
          }}
        />
      )}

      <Button variant="gradient" size="lg" className="self-center" onClick={onContinue}>
        <Sparkles aria-hidden="true" />
        Choose a style
        <ArrowRight aria-hidden="true" />
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="secondary" onClick={onAdjust}>
          <Crop aria-hidden="true" />
          Adjust crop
        </Button>
        <Button variant="ghost" onClick={onStartOver}>
          <ImageUp aria-hidden="true" />
          Use a different photo
        </Button>
      </div>
    </div>
  )
}
