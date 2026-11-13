import { useId, useState } from 'react'
import { FrameCanvas, type FrameSettings, type SourceImage } from '@/features/frames'
import { cn } from '@/lib/cn'

type View = 'profile' | 'square' | 'sizes'

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'square', label: 'Square' },
  { id: 'sizes', label: 'Sizes' },
]

export interface AvatarPreviewsProps {
  settings: FrameSettings
  source: SourceImage | null
  label: string
}

/**
 * Live previews of the export, all drawn by the same renderer as the downloaded file:
 * a profile header (circle crop), the full square, and common avatar sizes.
 */
export function AvatarPreviews({ settings, source, label }: AvatarPreviewsProps) {
  const [view, setView] = useState<View>('profile')
  const [showSafeArea, setShowSafeArea] = useState(false)
  const name = useId()
  const safeId = useId()

  const guide = showSafeArea && (
    <div
      aria-hidden="true"
      data-testid="export-safe-area"
      className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-white/80 mix-blend-difference"
    />
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <fieldset className="mx-auto inline-flex rounded-full border border-border p-1">
        <legend className="sr-only">Preview</legend>
        {VIEWS.map((v) => (
          <label
            key={v.id}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm',
              'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent',
              view === v.id ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              name={name}
              value={v.id}
              checked={view === v.id}
              onChange={() => setView(v.id)}
              className="sr-only"
            />
            {v.label}
          </label>
        ))}
      </fieldset>

      <div className="rounded-(--radius-card) border border-border bg-surface p-5 sm:p-6">
        {view === 'profile' && (
          <div className="mx-auto flex max-w-sm flex-col gap-4">
            <div className="flex items-center gap-5">
              <div className="relative w-28 shrink-0 overflow-hidden rounded-full sm:w-32">
                <FrameCanvas settings={settings} source={source} label={label} />
                {guide}
              </div>
              <dl aria-hidden="true" className="grid flex-1 grid-cols-3 gap-2 text-center">
                {[
                  ['128', 'posts'],
                  ['2.4k', 'followers'],
                  ['301', 'following'],
                ].map(([value, text]) => (
                  <div key={text} className="flex flex-col-reverse">
                    <dt className="text-[0.7rem] text-fg-muted sm:text-xs">{text}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div aria-hidden="true">
              <p className="font-semibold">Your name</p>
              <p className="text-sm text-fg-muted">@yourhandle · how it looks on a profile</p>
            </div>
          </div>
        )}

        {view === 'square' && (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
            <div className="relative w-full overflow-hidden rounded-xl border border-border">
              <FrameCanvas settings={settings} source={source} label={`${label}, full square`} />
              {guide}
            </div>
            <p className="text-center text-xs text-fg-muted">
              The full 1080 × 1080 file. Platforms that crop to a circle hide the corners.
            </p>
          </div>
        )}

        {view === 'sizes' && (
          <ul className="flex flex-wrap items-end justify-center gap-6">
            {(
              [
                ['Profile', 'w-32'],
                ['Story ring', 'w-16'],
                ['Feed', 'w-10'],
                ['Comment', 'w-8'],
              ] as const
            ).map(([text, width], index) => (
              <li key={text} className="flex flex-col items-center gap-2">
                <div className={cn('relative overflow-hidden rounded-full', width)}>
                  <FrameCanvas
                    settings={settings}
                    source={source}
                    {...(index === 0 ? { label: `${label}, at profile size` } : {})}
                  />
                  {index === 0 && guide}
                </div>
                <span className="text-xs text-fg-muted">{text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label
        htmlFor={safeId}
        className="mx-auto inline-flex h-11 cursor-pointer items-center gap-2 text-sm text-fg-muted hover:text-fg"
      >
        <input
          id={safeId}
          type="checkbox"
          checked={showSafeArea}
          onChange={(e) => setShowSafeArea(e.target.checked)}
          className="size-4 accent-accent-strong"
        />
        Show safe area
      </label>
    </div>
  )
}
