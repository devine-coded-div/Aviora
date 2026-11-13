import { useId } from 'react'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/cn'

/** Brand mark (decorative) + wordmark. The wordmark provides the accessible name. */
export function Logo({ className }: { className?: string }) {
  const gradientId = useId()
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="var(--color-accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="13.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
        />
        <circle cx="16" cy="13" r="4.5" fill="var(--color-fg)" />
        <path d="M8.5 24.5c1.6-3.6 4.4-5.2 7.5-5.2s5.9 1.6 7.5 5.2" fill="var(--color-fg)" />
      </svg>
      <span className="text-[0.95rem] font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  )
}
