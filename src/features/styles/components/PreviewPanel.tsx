import { Crown, Eye, FlaskConical, Loader2, RefreshCcw, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Notice } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AvatarStyle } from '../types'
import type { ProviderInfo } from '../generation/types'
import type { GenerationJob } from '../hooks/useGeneration'
import { GENERATION_ERROR_MESSAGES, stageLabel } from '../messages'
import type { StyleResult } from '../store'

export interface PreviewPanelProps {
  style: AvatarStyle
  sourceUrl: string
  result: StyleResult | undefined
  /** The job, only when it concerns this style. */
  job: GenerationJob
  provider: ProviderInfo
  onGenerate: () => void
  onCancel: () => void
  /** Shown for "payment-required" errors when billing is available. */
  onGetCredits?: (() => void) | undefined
}

const MAX_SUGGESTED_RETRIES = 3

export function PreviewPanel({
  style,
  sourceUrl,
  result,
  job,
  provider,
  onGenerate,
  onCancel,
  onGetCredits,
}: PreviewPanelProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const running = job.status === 'running'
  const error = job.status === 'error' ? job : null
  const displayUrl = result && !showOriginal ? result.url : sourceUrl
  const isMockResult = result?.provider.kind === 'mock'

  return (
    <section aria-labelledby="preview-title" className="flex flex-col gap-4">
      <h3 id="preview-title" className="sr-only">
        Preview
      </h3>

      <div className="relative aspect-square overflow-hidden rounded-(--radius-card) border border-border bg-surface">
        <img
          src={displayUrl}
          alt={
            result && !showOriginal
              ? `Your avatar in the ${style.name} style${isMockResult ? ' (mock preview)' : ''}`
              : 'Your cropped photo, before styling'
          }
          className={cn('size-full object-cover transition-opacity', running && 'opacity-40')}
        />

        {result && !running && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {showOriginal ? (
              <Badge>Original</Badge>
            ) : isMockResult ? (
              <Badge tone="premium" className="bg-black/70 backdrop-blur">
                <FlaskConical aria-hidden="true" />
                Mock preview · not AI
              </Badge>
            ) : (
              <Badge tone="accent">{style.name}</Badge>
            )}
          </div>
        )}

        {running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Loader2 className="size-8 animate-spin text-accent" aria-hidden="true" />
            <div className="flex w-full max-w-60 flex-col gap-2">
              <p className="text-sm font-medium">
                {stageLabel(job.progress.stage, provider.runsOnDevice)}
              </p>
              <progress
                aria-label={`Generating ${style.name} preview`}
                max={100}
                value={job.progress.percent}
                className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent-strong [&::-webkit-progress-bar]:bg-surface-raised [&::-webkit-progress-value]:bg-accent-strong"
              />
              <p className="text-xs text-fg-muted tabular-nums" aria-hidden="true">
                {job.progress.percent}%
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={onCancel}>
              <X aria-hidden="true" />
              Cancel
            </Button>
          </div>
        )}

        {!result && !running && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4 pt-12">
            <p className="text-sm font-medium">Your photo</p>
            <p className="text-xs text-fg-muted">
              Generate a preview to see the {style.name} style.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <img
          src={displayUrl}
          alt=""
          className="size-14 shrink-0 rounded-full border border-border object-cover"
        />
        <div className="flex min-w-0 flex-col">
          <p className="truncate font-semibold">{style.name}</p>
          <p className="truncate text-sm text-fg-muted">{style.description}</p>
        </div>
      </div>

      {error && (
        <Notice
          message={
            GENERATION_ERROR_MESSAGES[error.kind === 'cancelled' ? 'provider-error' : error.kind]
          }
        >
          {error.kind === 'payment-required' && onGetCredits && (
            <Button size="sm" variant="gradient" onClick={onGetCredits}>
              <Crown aria-hidden="true" />
              Get credits
            </Button>
          )}
          {error.retryable && (
            <Button size="sm" variant="primary" onClick={onGenerate}>
              <RefreshCcw aria-hidden="true" />
              Try again
            </Button>
          )}
          {error.attempts >= MAX_SUGGESTED_RETRIES && (
            <p className="w-full text-xs text-fg-muted">
              Still not working? Try a different style, or come back in a few minutes.
            </p>
          )}
        </Notice>
      )}

      {!running && !error && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {result ? (
            <>
              <Button
                variant="secondary"
                className="sm:flex-1"
                // The label says what the button will show next; it flips with each press.
                onClick={() => setShowOriginal((v) => !v)}
              >
                {showOriginal ? <Sparkles aria-hidden="true" /> : <Eye aria-hidden="true" />}
                {showOriginal ? 'Show styled' : 'Show original'}
              </Button>
              <Button variant="ghost" className="sm:flex-1" onClick={onGenerate}>
                <RefreshCcw aria-hidden="true" />
                Regenerate
              </Button>
            </>
          ) : (
            <Button variant="gradient" size="lg" className="w-full" onClick={onGenerate}>
              <Sparkles aria-hidden="true" />
              Generate {style.name} preview
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
