import { cn } from '@/lib/cn'

/**
 * Circular safe-area guide over the square composition. Anything outside the circle is cropped
 * away in circular profile pictures. Purely visual.
 */
export function SafeAreaOverlay({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      {/* Dim the corners that a circular crop will hide. */}
      <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_closest-side,transparent_99%,rgb(0_0_0/0.45)_100%)]" />
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/70" />
    </div>
  )
}
