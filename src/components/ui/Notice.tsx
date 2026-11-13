import { AlertTriangle, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface NoticeMessage {
  title: string
  description: string
}

export interface NoticeProps {
  message: NoticeMessage
  tone?: 'error' | 'warning' | 'info'
  children?: ReactNode
  className?: string
}

/** Inline status message. Errors are announced immediately via role="alert". */
export function Notice({ message, tone = 'error', children, className }: NoticeProps) {
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-2xl border p-4 text-left',
        tone === 'error' && 'border-danger/40 bg-danger/10',
        tone === 'warning' && 'border-amber-300/30 bg-amber-300/10',
        tone === 'info' && 'border-border bg-surface',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-5 shrink-0',
          tone === 'error' && 'text-danger',
          tone === 'warning' && 'text-amber-200',
          tone === 'info' && 'text-accent',
        )}
      />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{message.title}</p>
        <p className="text-sm text-pretty text-fg-muted">{message.description}</p>
        {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}
