import { cn } from '@/lib/cn'

const STUDIO_STEPS = ['Photo', 'Crop', 'Style', 'Frame', 'Download'] as const

/** Overall editor progress. The current step is marked with aria-current="step". */
export function StudioProgress({ current }: { current: number }) {
  return (
    <ol
      aria-label="Progress"
      className="flex items-center justify-center gap-2 text-xs sm:gap-3 sm:text-sm"
    >
      {STUDIO_STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'flex items-center gap-2',
            index === current ? 'font-medium text-fg' : 'text-fg-subtle',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex size-6 items-center justify-center rounded-full border text-[0.7rem]',
              index < current && 'border-accent bg-accent/15 text-accent',
              index === current && 'border-accent-strong bg-accent-strong text-white',
              index > current && 'border-border',
            )}
          >
            {index + 1}
          </span>
          <span className={cn(index !== current && 'hidden sm:inline')}>{label}</span>
          {index < current && <span className="sr-only">(done)</span>}
        </li>
      ))}
    </ol>
  )
}
