import { useCallback, useState } from 'react'
import { CaptureFlow, usePhotoStore, type CaptureStep } from '@/features/capture'
import { ExportStep } from '@/features/export'
import { FrameStep } from '@/features/frames'
import {
  GenerationProviderScope,
  getStyle,
  StyleStep,
  useStyleStore,
  type AvatarGenerationProvider,
} from '@/features/styles'
import { StudioProgress } from './StudioProgress'

type Stage = 'photo' | 'style' | 'frame' | 'export'

function captureProgress(step: CaptureStep): number {
  return step === 'crop' || step === 'done' ? 1 : 0
}

/** Top-level editor: photo (capture + crop) → style → frame → preview & download. */
export function StudioFlow({ provider }: { provider?: AvatarGenerationProvider }) {
  const cropped = usePhotoStore((s) => s.cropped)
  const selectedStyleId = useStyleStore((s) => s.selectedId)
  const styleResult = useStyleStore((s) =>
    s.sourceUrl === cropped?.url ? s.results[s.selectedId] : undefined,
  )
  const [stage, setStage] = useState<Stage>('photo')
  const [captureStep, setCaptureStep] = useState<CaptureStep>('source')
  const [navigated, setNavigated] = useState(false)

  const go = useCallback((next: Stage) => {
    setNavigated(true)
    setStage(next)
  }, [])

  const activeStage: Stage = cropped ? stage : 'photo'
  const current =
    activeStage === 'export'
      ? 4
      : activeStage === 'frame'
        ? 3
        : activeStage === 'style'
          ? 2
          : captureProgress(captureStep)

  // Frame the styled result when there is one; otherwise the plain cropped photo.
  const styleName = getStyle(selectedStyleId)?.name
  const frameSource = styleResult
    ? {
        url: styleResult.url,
        label: `${styleName ?? 'Styled'} style`,
        isMock: styleResult.provider.kind === 'mock',
        styleName,
      }
    : cropped
      ? { url: cropped.url, label: 'your photo (no style)', isMock: false }
      : null

  return (
    <GenerationProviderScope {...(provider ? { provider } : {})}>
      <div className="flex flex-col gap-8">
        <StudioProgress current={current} />
        {activeStage === 'export' && frameSource ? (
          <ExportStep source={frameSource} onBack={() => go('frame')} focusOnMount={navigated} />
        ) : activeStage === 'frame' && frameSource ? (
          <FrameStep
            source={frameSource}
            onBack={() => go('style')}
            onContinue={() => go('export')}
            focusOnMount={navigated}
          />
        ) : activeStage === 'style' && cropped ? (
          <StyleStep
            source={{ blob: cropped.blob, url: cropped.url }}
            onBack={() => go('photo')}
            onContinue={() => go('frame')}
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
