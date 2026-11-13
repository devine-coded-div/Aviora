import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { drawAvatar, type SourceImage } from '../render/drawAvatar'
import type { FrameSettings } from '../types'

export interface FrameCanvasProps {
  settings: FrameSettings
  source: SourceImage | null
  /** Text alternative. Omit for decorative thumbnails. */
  label?: string
  /** Fixed backing-store size; otherwise matches the element's size × devicePixelRatio. */
  renderSize?: number
  className?: string
}

/**
 * Square canvas that renders the composition. The backing store tracks the element's CSS size
 * times devicePixelRatio, and the renderer works in proportions of that size, so the frame
 * lines up with CSS overlays (like the safe-area guide) at every screen size.
 */
export function FrameCanvas({ settings, source, label, renderSize, className }: FrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [measured, setMeasured] = useState(0)
  const size = renderSize ?? measured

  useLayoutEffect(() => {
    if (renderSize) return
    const canvas = canvasRef.current
    if (!canvas) return
    const measure = () => {
      const width = canvas.getBoundingClientRect().width
      setMeasured(Math.max(1, Math.round(width * (window.devicePixelRatio || 1))))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [renderSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size <= 0) return
    if (canvas.width !== size) canvas.width = size
    if (canvas.height !== size) canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawAvatar(ctx, size, settings, source)
  }, [settings, source, size])

  return (
    <canvas
      ref={canvasRef}
      className={cn('block aspect-square w-full', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  )
}
