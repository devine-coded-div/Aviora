import { useQuery } from '@tanstack/react-query'
import { Info, Loader2, RefreshCcw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Button, Notice } from '@/components/ui'
import { env } from '@/config/env'
import { BillingProvider, CreditsBar, useBilling } from '@/features/billing'
import { CaptureFlow, usePhotoStore, type CaptureStep } from '@/features/capture'
import { ExportStep } from '@/features/export'
import { FrameStep } from '@/features/frames'
import {
  createApiProvider,
  fetchProviderInfo,
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

export interface StudioFlowProps {
  /** Override the generation provider (tests). Forces on-device mode. */
  provider?: AvatarGenerationProvider
  /** API base URL. When set, generation and entitlements run on the server. */
  apiBaseUrl?: string
}

/** Top-level editor: photo (capture + crop) → style → frame → preview & download. */
export function StudioFlow({ provider, apiBaseUrl = env.apiBaseUrl }: StudioFlowProps) {
  if (apiBaseUrl && !provider) {
    return (
      <BillingProvider baseUrl={apiBaseUrl}>
        <ServerStudio baseUrl={apiBaseUrl} />
      </BillingProvider>
    )
  }
  return <StudioSteps provider={provider} server={null} />
}

interface ServerState {
  status: 'loading' | 'ready' | 'error'
  retry: () => void
}

/** API mode: server-side generation with server-enforced free quota and credits. */
function ServerStudio({ baseUrl }: { baseUrl: string }) {
  const billing = useBilling()
  const token = billing?.token ?? null

  const info = useQuery({
    queryKey: ['provider-info', baseUrl],
    queryFn: () => fetchProviderInfo(baseUrl),
    staleTime: 5 * 60_000,
  })
  const provider = useMemo(
    () =>
      info.data
        ? createApiProvider({
            baseUrl,
            info: info.data,
            headers: (): Record<string, string> => (token ? { 'X-Account-Token': token } : {}),
          })
        : undefined,
    // Rebuilt only when the account changes (startup, or restoring on another device).
    [baseUrl, info.data, token],
  )
  const status: ServerState['status'] =
    provider && billing?.status === 'ready'
      ? 'ready'
      : info.isError || billing?.status === 'error'
        ? 'error'
        : 'loading'
  const server: ServerState = {
    status,
    retry: () => {
      void info.refetch()
      billing?.refresh()
    },
  }
  return <StudioSteps provider={provider} server={server} />
}

function StudioSteps({
  provider,
  server,
}: {
  provider: AvatarGenerationProvider | undefined
  server: ServerState | null
}) {
  const billing = useBilling()
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

  const premiumNote = billing ? (
    <p className="flex gap-2 text-xs text-fg-subtle">
      <Info className="size-4 shrink-0" aria-hidden="true" />
      Free styles use your daily free generations first. Premium styles use 1 credit. Credits are
      refunded automatically if a generation fails.
    </p>
  ) : undefined

  return (
    <GenerationProviderScope {...(provider ? { provider } : {})}>
      <div className="flex flex-col gap-8">
        <StudioProgress current={current} />
        {billing && activeStage === 'style' && <CreditsBar />}
        {activeStage === 'export' && frameSource ? (
          <ExportStep source={frameSource} onBack={() => go('frame')} focusOnMount={navigated} />
        ) : activeStage === 'frame' && frameSource ? (
          <FrameStep
            source={frameSource}
            onBack={() => go('style')}
            onContinue={() => go('export')}
            focusOnMount={navigated}
          />
        ) : activeStage === 'style' && cropped && server && server.status !== 'ready' ? (
          <ServerStatus status={server.status} onRetry={server.retry} onBack={() => go('photo')} />
        ) : activeStage === 'style' && cropped ? (
          <StyleStep
            source={{ blob: cropped.blob, url: cropped.url }}
            onBack={() => go('photo')}
            onContinue={() => go('frame')}
            focusOnMount={navigated}
            onGetCredits={billing ? () => billing.openUpgrade('premium') : undefined}
            onGenerationSettled={billing?.refresh}
            premiumNote={premiumNote}
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

function ServerStatus({
  status,
  onRetry,
  onBack,
}: {
  status: 'loading' | 'error'
  onRetry: () => void
  onBack: () => void
}) {
  if (status === 'loading') {
    return (
      <output className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        Connecting to the studio…
      </output>
    )
  }
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-8">
      <Notice
        message={{
          title: 'Can’t reach the studio server',
          description: 'Check your connection and try again. Your photo is still here.',
        }}
      >
        <Button size="sm" variant="primary" onClick={onRetry}>
          <RefreshCcw aria-hidden="true" />
          Try again
        </Button>
        <Button size="sm" variant="ghost" onClick={onBack}>
          Back to photo
        </Button>
      </Notice>
    </div>
  )
}
