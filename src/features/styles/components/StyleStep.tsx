import { ArrowLeft, ArrowRight, FlaskConical, Info, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, StepHeading } from '@/components/ui'
import { getStyle, stylesInCategory } from '../catalog'
import { useGeneration } from '../hooks/useGeneration'
import { useStyleStore } from '../store'
import { CategoryFilter, type CategoryFilterValue } from './CategoryFilter'
import { PreviewPanel } from './PreviewPanel'
import { StyleCatalog } from './StyleCatalog'

export interface StyleStepProps {
  /** The square cropped photo from the capture step. */
  source: { blob: Blob; url: string }
  onBack: () => void
  /** Move on to frames (with the selected style's result if one was generated). */
  onContinue: () => void
  focusOnMount: boolean
  /** Opens the upgrade flow (API mode only). */
  onGetCredits?: (() => void) | undefined
  /** Called after each generation finishes or fails (e.g. to refresh credits). */
  onGenerationSettled?: (() => void) | undefined
  /** Replaces the default note under the catalog (API mode explains credits instead). */
  premiumNote?: React.ReactNode
}

export function StyleStep({
  source,
  onBack,
  onContinue,
  focusOnMount,
  onGetCredits,
  onGenerationSettled,
  premiumNote,
}: StyleStepProps) {
  const selectedId = useStyleStore((s) => s.selectedId)
  const results = useStyleStore((s) => s.results)
  const select = useStyleStore((s) => s.select)
  const syncSource = useStyleStore((s) => s.syncSource)
  const pendingId = useStyleStore((s) => s.pendingId)
  const clearPending = useStyleStore((s) => s.clearPending)
  const storeSourceUrl = useStyleStore((s) => s.sourceUrl)
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const { job, generate, cancel, provider } = useGeneration(source, onGenerationSettled)
  const [announcement, setAnnouncement] = useState('')

  // Results belong to one cropped photo; drop them if the photo changed.
  useEffect(() => syncSource(source.url), [source.url, syncSource])

  // Changing the photo keeps the chosen style: re-apply it to the new photo automatically.
  useEffect(() => {
    if (!pendingId || storeSourceUrl !== source.url || job.status !== 'idle') return
    clearPending()
    if (pendingId === selectedId) void generate(pendingId)
  }, [pendingId, storeSourceUrl, source.url, job.status, selectedId, clearPending, generate])

  const style = getStyle(selectedId)!
  // Results for an older photo are never shown over the new one (before syncSource runs).
  const currentResults = useMemo(
    () => (storeSourceUrl === source.url ? results : {}),
    [storeSourceUrl, source.url, results],
  )
  const result = currentResults[selectedId]
  const readyIds = useMemo(() => new Set(Object.keys(currentResults)), [currentResults])
  const jobForSelected =
    job.status !== 'idle' && job.styleId === selectedId ? job : { status: 'idle' as const }

  // Announce completion for screen readers (errors announce themselves via role="alert").
  const [lastResultUrl, setLastResultUrl] = useState(result?.url)
  if (result?.url !== lastResultUrl) {
    setLastResultUrl(result?.url)
    if (result) setAnnouncement(`${style.name} preview ready.`)
  }

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        focusOnMount={focusOnMount}
        description="Pick a look, generate a preview and compare. You can try as many as you like."
      >
        Choose a style
      </StepHeading>

      {provider.kind === 'mock' && (
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm"
        >
          <FlaskConical className="mt-0.5 size-5 shrink-0 text-amber-200" aria-hidden="true" />
          <p className="text-pretty">
            <span className="font-medium">Preview mode — not AI.</span>{' '}
            <span className="text-fg-muted">
              Styles are simulated with simple colour filters so you can try the flow. Real
              AI-generated avatars are coming soon.{' '}
              {provider.runsOnDevice
                ? 'Your photo isn’t uploaded.'
                : 'Your cropped photo is sent to our server to make the preview and deleted automatically.'}
            </span>
          </p>
        </div>
      )}
      {provider.kind !== 'mock' && !provider.runsOnDevice && (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          Generating sends your cropped photo to our server. It’s deleted automatically after
          processing and never used for training.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-24">
          <PreviewPanel
            key={selectedId}
            style={style}
            sourceUrl={source.url}
            result={result}
            job={jobForSelected}
            provider={provider}
            onGenerate={() => void generate(selectedId)}
            onCancel={cancel}
            onGetCredits={onGetCredits}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <CategoryFilter value={category} onChange={setCategory} />
          <StyleCatalog
            styles={stylesInCategory(category)}
            selectedId={selectedId}
            readyIds={readyIds}
            onSelect={select}
          />
          {premiumNote ?? (
            <p className="flex gap-2 text-xs text-fg-subtle">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              Premium styles will need an upgrade once payments launch. During this preview every
              style is free to try.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="self-start">
          <ArrowLeft aria-hidden="true" />
          Change photo
        </Button>
        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          <Button variant="primary" onClick={onContinue} disabled={job.status === 'running'}>
            Continue to frames
            <ArrowRight aria-hidden="true" />
          </Button>
          <p className="text-xs text-fg-muted sm:text-right">
            {result
              ? `Uses your ${style.name} preview.`
              : 'No preview yet — your cropped photo will be framed as is.'}
          </p>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
