import { ArrowLeft, FlaskConical, Info } from 'lucide-react'
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
  focusOnMount: boolean
}

export function StyleStep({ source, onBack, focusOnMount }: StyleStepProps) {
  const selectedId = useStyleStore((s) => s.selectedId)
  const results = useStyleStore((s) => s.results)
  const select = useStyleStore((s) => s.select)
  const syncSource = useStyleStore((s) => s.syncSource)
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const { job, generate, cancel, provider } = useGeneration(source)
  const [announcement, setAnnouncement] = useState('')

  // Results belong to one cropped photo; drop them if the photo changed.
  useEffect(() => syncSource(source.url), [source.url, syncSource])

  const style = getStyle(selectedId)!
  const result = results[selectedId]
  const readyIds = useMemo(() => new Set(Object.keys(results)), [results])
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
              Styles are simulated with simple colour filters on your device so you can try the
              flow. Real AI-generated avatars are coming soon. Your photo isn’t uploaded.
            </span>
          </p>
        </div>
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
          <p className="flex gap-2 text-xs text-fg-subtle">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            Premium styles will need an upgrade once payments launch. During this preview every
            style is free to try.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="self-start">
          <ArrowLeft aria-hidden="true" />
          Change photo
        </Button>
        <p className="text-sm text-fg-muted">Next: frames and backgrounds — coming soon.</p>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
