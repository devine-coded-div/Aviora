import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SectionHeadingProps {
  /** Becomes the heading's id; pair with `aria-labelledby` on the section. */
  id: string
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

/** Eyebrow + h2 + supporting copy used at the top of each landing section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col gap-3',
        align === 'center' && 'mx-auto items-center text-center',
        className,
      )}
    >
      {eyebrow && (
        <p className="text-sm font-medium tracking-wide text-accent uppercase">{eyebrow}</p>
      )}
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="text-base text-pretty text-fg-muted sm:text-lg">{description}</p>
      )}
    </div>
  )
}
