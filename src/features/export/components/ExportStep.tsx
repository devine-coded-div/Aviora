import { ArrowLeft, Check, Download, FlaskConical, Loader2, RefreshCcw, Share2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Button, Notice, StepHeading } from '@/components/ui'
import { describeFrame, getPreset, useFrameStore, useSourceImage } from '@/features/frames'
import { DEFAULT_EXPORT_SIZE_PX } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useExport } from '../hooks/useExport'
import { canShareFiles, formatBytes } from '../lib/deliver'
import { buildFileName, defaultBaseName, MAX_BASE_LENGTH } from '../lib/fileName'
import { EXPORT_ERROR_MESSAGES } from '../messages'
import { FORMAT_INFO, type ExportFormat } from '../types'
import { AvatarPreviews } from './AvatarPreviews'

export interface ExportStepProps {
  /** Same image the frame step used: styled result or cropped photo. */
  source: { url: string; label: string; isMock: boolean; styleName?: string | undefined }
  onBack: () => void
  focusOnMount: boolean
}

const SIZE = DEFAULT_EXPORT_SIZE_PX

export function ExportStep({ source, onBack, focusOnMount }: ExportStepProps) {
  const settings = useFrameStore((s) => s.present)
  const image = useSourceImage(source.url)
  const ready = image.status === 'ready' ? image.source : null
  const frameName = getPreset(settings.kind).name

  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)
  const suggested = defaultBaseName({ style: source.styleName, frame: frameName })
  const [baseName, setBaseName] = useState<string | null>(null)
  const fileName = buildFileName(baseName ?? suggested, format, SIZE)

  const { state, download, share } = useExport({
    settings,
    source: ready,
    size: SIZE,
    format,
    quality,
    fileName,
  })
  const [shareSupported] = useState(canShareFiles)
  const busy = state.status === 'rendering'
  const formatName = useId()
  const qualityId = useId()
  const nameId = useId()
  const nameHintId = useId()
  const label = useMemo(() => describeFrame(settings), [settings])

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        focusOnMount={focusOnMount}
        description={`Check how it looks, then download a ${SIZE} × ${SIZE} image.`}
      >
        Preview and download
      </StepHeading>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <section aria-label="Preview" className="min-w-0 lg:sticky lg:top-24">
          {image.status === 'error' ? (
            <Notice
              message={{
                title: 'Couldn’t load your avatar',
                description: 'Go back and generate the style again, or change your photo.',
              }}
            />
          ) : (
            <AvatarPreviews settings={settings} source={ready} label={label} />
          )}
        </section>

        <section aria-label="Export options" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-6 rounded-(--radius-card) border border-border bg-surface p-5 sm:p-6">
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-semibold">Format</legend>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((f) => (
                  <label
                    key={f}
                    className={cn(
                      'flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-colors',
                      'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
                      format === f
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-strong',
                    )}
                  >
                    <input
                      type="radio"
                      name={formatName}
                      value={f}
                      checked={format === f}
                      onChange={() => setFormat(f)}
                      className="sr-only"
                    />
                    <span className="font-medium">{FORMAT_INFO[f].label}</span>
                    <span className="text-xs text-fg-muted">{FORMAT_INFO[f].hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {format === 'jpeg' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor={qualityId} className="text-sm font-medium">
                    JPEG quality
                  </label>
                  <output htmlFor={qualityId} className="text-sm text-fg-muted tabular-nums">
                    {Math.round(quality * 100)}%
                  </output>
                </div>
                <input
                  id={qualityId}
                  type="range"
                  min={0.6}
                  max={1}
                  step={0.01}
                  value={quality}
                  aria-valuetext={`${Math.round(quality * 100)}%`}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="h-8 w-full cursor-pointer accent-accent-strong"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-sm font-medium">
                File name
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-canvas focus-within:outline-2 focus-within:outline-accent">
                <input
                  id={nameId}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={MAX_BASE_LENGTH + 20}
                  value={baseName ?? suggested}
                  onChange={(e) => setBaseName(e.target.value)}
                  aria-describedby={nameHintId}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                />
                <span className="pr-3 text-sm whitespace-nowrap text-fg-muted" aria-hidden="true">
                  -{SIZE}x{SIZE}.{FORMAT_INFO[format].ext}
                </span>
              </div>
              <p id={nameHintId} className="text-xs text-fg-subtle">
                Saves as <span className="font-medium break-all text-fg-muted">{fileName}</span>
              </p>
            </div>

            <p className="text-sm text-fg-muted">
              Size: {SIZE} × {SIZE} px · square, works for Instagram and every other profile.
            </p>
          </div>

          {source.isMock && (
            <p className="flex gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm">
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-200" aria-hidden="true" />
              <span className="text-fg-muted">
                <span className="font-medium text-fg">Mock style, not AI.</span> This avatar uses a
                preview filter. Real AI styles are coming soon.
              </span>
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="gradient"
              size="lg"
              className="sm:flex-1"
              onClick={() => void download()}
              disabled={busy || !ready}
            >
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {busy ? 'Preparing image…' : `Download ${FORMAT_INFO[format].label}`}
            </Button>
            {shareSupported && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => void share()}
                disabled={busy || !ready}
              >
                <Share2 aria-hidden="true" />
                Share
              </Button>
            )}
          </div>

          <div aria-live="polite">
            {state.status === 'done' && (
              <p className="flex gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
                <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                <span>
                  <span className="font-medium">
                    {state.via === 'share' ? 'Shared' : 'Downloaded'} {state.image.fileName}
                  </span>
                  <span className="block text-fg-muted">
                    {state.image.width} × {state.image.height} px ·{' '}
                    {formatBytes(state.image.blob.size)}
                  </span>
                </span>
              </p>
            )}
          </div>

          {state.status === 'error' && (
            <Notice message={EXPORT_ERROR_MESSAGES[state.kind]}>
              <Button size="sm" variant="primary" onClick={() => void download()}>
                <RefreshCcw aria-hidden="true" />
                Try again
              </Button>
            </Notice>
          )}
        </section>
      </div>

      <div className="flex border-t border-border/60 pt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back to frames
        </Button>
      </div>
    </div>
  )
}
