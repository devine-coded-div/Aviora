import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'premium'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-border-strong bg-surface-raised text-fg-muted',
  accent: 'border-accent/30 bg-accent/10 text-accent',
  premium: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
}

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
