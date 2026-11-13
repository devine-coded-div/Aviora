import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import type { SourcePhoto } from '../types'
import { SafeAreaOverlay } from './SafeAreaOverlay'

export interface PhotoReviewProps {
  photo: SourcePhoto
  onRetake: () => void
  onAccept: () => void
}

/** Look at the shot before committing to it. */
export function PhotoReview({ photo, onRetake, onAccept }: PhotoReviewProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="relative aspect-square overflow-hidden rounded-(--radius-card) border border-border">
        <img src={photo.url} alt="Your new selfie" className="size-full object-cover" />
        <SafeAreaOverlay />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onRetake}>
          <RotateCcw aria-hidden="true" />
          Retake
        </Button>
        <Button variant="primary" onClick={onAccept}>
          <Check aria-hidden="true" />
          Use this photo
        </Button>
      </div>
    </div>
  )
}
