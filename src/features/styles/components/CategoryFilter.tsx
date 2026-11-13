import { cn } from '@/lib/cn'
import { STYLE_CATEGORIES } from '../catalog'
import type { StyleCategory } from '../types'

export type CategoryFilterValue = StyleCategory | 'all'

const OPTIONS: readonly { id: CategoryFilterValue; label: string }[] = [
  { id: 'all', label: 'All' },
  ...STYLE_CATEGORIES,
]

/** Toggle buttons that filter the catalog. Horizontally scrollable on small screens. */
export function CategoryFilter({
  value,
  onChange,
}: {
  value: CategoryFilterValue
  onChange: (value: CategoryFilterValue) => void
}) {
  return (
    <fieldset className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <legend className="sr-only">Filter styles by category</legend>
      <div className="flex w-max gap-2">
        {OPTIONS.map((option) => {
          const active = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={cn(
                'h-10 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-accent bg-accent/15 text-fg'
                  : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
