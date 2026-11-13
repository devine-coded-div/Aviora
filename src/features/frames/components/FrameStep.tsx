import { ArrowLeft, Circle, FlaskConical, Loader2, Square } from 'lucide-react'
import { useId, useState } from 'react'
import { Badge, Button, Notice, StepHeading } from '@/components/ui'
import { cn } from '@/lib/cn'
import { describeFrame } from '../describe'
import { useSourceImage } from '../hooks/useSourceImage'
import { getPreset } from '../presets'
import { useFrameStore } from '../store'
import { FrameCanvas } from './FrameCanvas'
import { FrameControls } from './FrameControls'
import { FramePresetPicker } from './FramePresetPicker'
import { HistoryControls } from './HistoryControls'

export interface FrameStepProps {
  /** The image to frame: the styled result if there is one, else the cropped photo. */
  source: { url: string; label: string; isMock: boolean }
  onBack: () => void
  focusOnMount: boolean
}

type View = 'circle' | 'square'

export function FrameStep({ source, onBack, focusOnMount }: FrameStepProps) {
  const settings = useFrameStore((s) => s.present)
  const choosePreset = useFrameStore((s) => s.choosePreset)
  const update = useFrameStore((s) => s.update)
  const commit = useFrameStore((s) => s.commit)
  const image = useSourceImage(source.url)
  const [view, setView] = useState<View>('circle')
  const [showSafeArea, setShowSafeArea] = useState(false)
  const safeAreaId = useId()
  const preset = getPreset(settings.kind)
  const ready = image.status === 'ready' ? image.source : null

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        focusOnMount={focusOnMount}
        description="Add a ring, glow or flames. Everything stays inside the circle profile pictures show."
      >
        Frame your avatar
      </StepHeading>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <section
          aria-label="Frame preview"
          className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24"
        >
          <div
            className={cn(
              'relative mx-auto w-full max-w-md overflow-hidden border border-border bg-surface transition-[border-radius]',
              view === 'circle' ? 'rounded-full' : 'rounded-(--radius-card)',
            )}
          >
            <FrameCanvas settings={settings} source={ready} label={describeFrame(settings)} />
            {showSafeArea && (
              <div
                aria-hidden="true"
                data-testid="safe-area-guide"
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-white/80 mix-blend-difference"
              />
            )}
            {image.status === 'loading' && (
              <output className="absolute inset-0 flex items-center justify-center gap-2 bg-surface/80 text-sm text-fg-muted">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Loading your avatar…
              </output>
            )}
          </div>

          {image.status === 'error' && (
            <Notice
              message={{
                title: 'Couldn’t load your avatar',
                description: 'Go back and generate the style again, or change your photo.',
              }}
            />
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <fieldset className="inline-flex rounded-full border border-border p-1">
              <legend className="sr-only">Preview shape</legend>
              {(
                [
                  ['circle', 'Circle', Circle],
                  ['square', 'Square', Square],
                ] as const
              ).map(([value, label, Icon]) => (
                <label
                  key={value}
                  className={cn(
                    'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm',
                    'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent',
                    view === value ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  <input
                    type="radio"
                    name="preview-shape"
                    value={value}
                    checked={view === value}
                    onChange={() => setView(value)}
                    className="sr-only"
                  />
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </label>
              ))}
            </fieldset>
            <label
              htmlFor={safeAreaId}
              className="inline-flex h-11 cursor-pointer items-center gap-2 px-2 text-sm text-fg-muted hover:text-fg"
            >
              <input
                id={safeAreaId}
                type="checkbox"
                checked={showSafeArea}
                onChange={(e) => setShowSafeArea(e.target.checked)}
                className="size-4 accent-accent-strong"
              />
              Show safe area
            </label>
          </div>

          <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-fg-muted">
            Framing: {source.label}
            {source.isMock && (
              <Badge tone="premium">
                <FlaskConical aria-hidden="true" />
                Mock preview · not AI
              </Badge>
            )}
          </p>
        </section>

        <section aria-label="Frame settings" className="flex min-w-0 flex-col gap-6">
          <FramePresetPicker value={settings.kind} source={ready} onChange={choosePreset} />

          <div className="flex flex-col gap-5 rounded-(--radius-card) border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{preset.name}</h3>
                <p className="text-sm text-fg-muted">{preset.description}</p>
              </div>
            </div>
            <FrameControls
              controls={preset.controls}
              settings={settings}
              onChange={update}
              onCommit={commit}
            />
          </div>

          <HistoryControls />
        </section>
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="self-start">
          <ArrowLeft aria-hidden="true" />
          Back to styles
        </Button>
        <p className="text-sm text-fg-muted">Next: preview and download — coming soon.</p>
      </div>
    </div>
  )
}
