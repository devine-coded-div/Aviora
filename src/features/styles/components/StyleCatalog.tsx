import { Check, CircleCheck, Crown } from 'lucide-react'
import { useId } from 'react'
import { AvatarArt } from '@/components/avatar'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { categoryLabel, isStyleId, type StyleId } from '../catalog'
import type { AvatarStyle } from '../types'

export interface StyleCatalogProps {
  styles: readonly AvatarStyle[]
  selectedId: StyleId
  readyIds: ReadonlySet<string>
  onSelect: (id: StyleId) => void
}

/**
 * Native radio group: one tab stop, arrow keys move the selection, Space selects.
 * Each card is the radio's label.
 */
export function StyleCatalog({ styles, selectedId, readyIds, onSelect }: StyleCatalogProps) {
  const name = useId()
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Avatar style</legend>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {styles.map((style) => {
          const selected = style.id === selectedId
          const ready = readyIds.has(style.id)
          const descriptionId = `${name}-${style.id}-desc`
          return (
            <li key={style.id}>
              <label
                className={cn(
                  'relative flex h-full cursor-pointer flex-col gap-3 rounded-2xl border bg-surface p-3 transition-colors',
                  'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
                  selected
                    ? 'border-accent bg-accent/5 ring-2 ring-accent/40'
                    : 'border-border hover:border-border-strong',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={style.id}
                  checked={selected}
                  onChange={() => {
                    if (isStyleId(style.id)) onSelect(style.id)
                  }}
                  aria-describedby={descriptionId}
                  className="sr-only"
                />
                <div className="relative aspect-square overflow-hidden rounded-xl">
                  <div
                    className="size-full [&>svg]:size-full"
                    style={style.thumbnail.filter ? { filter: style.thumbnail.filter } : undefined}
                  >
                    <AvatarArt variant={style.thumbnail.art} />
                  </div>
                  {selected && (
                    <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-accent-strong text-white shadow-lg">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{style.name}</span>
                    {ready && (
                      <>
                        <CircleCheck className="size-4 text-success" aria-hidden="true" />
                        <span className="sr-only">(preview ready)</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-fg-subtle">{categoryLabel(style.category)}</span>
                  <span id={descriptionId} className="line-clamp-2 text-xs text-fg-muted">
                    {style.description}
                  </span>
                  {style.premium && (
                    <Badge tone="premium" className="mt-1 self-start">
                      <Crown aria-hidden="true" />
                      Premium
                    </Badge>
                  )}
                </div>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
