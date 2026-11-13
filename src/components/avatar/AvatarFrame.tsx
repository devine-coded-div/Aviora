import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { FrameStyle } from './types'

/**
 * CSS approximation of the frame treatments, for marketing previews only.
 * The editor renders frames on a canvas so they can be exported (Phase 4–5).
 * Ring and gap are absolutely positioned layers with % insets, which resolve against the frame's
 * own size (unlike % padding, which resolves against the parent's width).
 */
const ringStyles: Record<FrameStyle, CSSProperties> = {
  flame: {
    background: 'conic-gradient(from 200deg, #f97316, #facc15, #ef4444, #fb923c, #f97316)',
    boxShadow: '0 0 28px -2px rgb(249 115 22 / 0.65), 0 0 60px -10px rgb(239 68 68 / 0.6)',
  },
  neon: {
    background: 'conic-gradient(from 0deg, #a78bfa, #22d3ee, #f472b6, #a78bfa)',
    boxShadow: '0 0 24px -2px rgb(167 139 250 / 0.7), 0 0 48px -8px rgb(34 211 238 / 0.45)',
  },
  gradient: { background: 'linear-gradient(45deg, #facc15, #f43f5e 50%, #8b5cf6)' },
  solid: { background: '#34d399' },
  dark: { background: 'linear-gradient(180deg, #3f3f46, #18181b)' },
  minimal: { background: 'rgb(250 250 250 / 0.85)' },
}

const insets: Record<'default' | 'thin', { gap: string; image: string }> = {
  default: { gap: '4%', image: '7%' },
  thin: { gap: '1.5%', image: '4.5%' },
}

export interface AvatarFrameProps {
  frame: FrameStyle
  children: ReactNode
  className?: string
}

export function AvatarFrame({ frame, children, className }: AvatarFrameProps) {
  const inset = insets[frame === 'minimal' ? 'thin' : 'default']
  return (
    <div
      className={cn('relative aspect-square shrink-0 rounded-full', className)}
      style={ringStyles[frame]}
    >
      <div className="absolute rounded-full bg-canvas" style={{ inset: inset.gap }} />
      <div
        className="absolute overflow-hidden rounded-full [&>svg]:size-full"
        style={{ inset: inset.image }}
      >
        {children}
      </div>
    </div>
  )
}
