import { useCallback, useState } from 'react'
import { CaptureFlow, usePhotoStore, type CaptureStep } from '@/features/capture'
import {
  GenerationProviderScope,
  StyleStep,
  type AvatarGenerationProvider,
} from '@/features/styles'
import { StudioProgress } from './StudioProgress'

type Stage = 'photo' | 'style'

function captureProgress(step: CaptureStep): number {
  return step === 'crop' || step === 'done' ? 1 : 0
}

/** Top-level editor: photo (capture + crop) → style. Frames and export join in later phases. */
export function StudioFlow({ provider }: { provider?: AvatarGenerationProvider }) {
  const cropped = usePhotoStore((s) => s.cropped)
  const [stage, setStage] = useState<Stage>('photo')
  const [captureStep, setCaptureStep] = useState<CaptureStep>('source')
  const [navigated, setNavigated] = useState(false)

  const go = useCallback((next: Stage) => {
    setNavigated(true)
    setStage(next)
  }, [])

  const current = stage === 'style' && cropped ? 2 : captureProgress(captureStep)

  return (
    <GenerationProviderScope {...(provider ? { provider } : {})}>
      <div className="flex flex-col gap-8">
        <StudioProgress current={current} />
        {stage === 'style' && cropped ? (
          <StyleStep
            source={{ blob: cropped.blob, url: cropped.url }}
            onBack={() => go('photo')}
            focusOnMount={navigated}
          />
        ) : (
          <CaptureFlow
            onContinue={() => go('style')}
            onStepChange={setCaptureStep}
            focusOnMount={navigated}
          />
        )}
      </div>
    </GenerationProviderScope>
  )
}
