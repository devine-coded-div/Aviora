import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Step title that receives focus when the step appears after a user action, so keyboard and
 * screen-reader users land at the start of the new content.
 */
export function StepHeading({
  children,
  description,
  focusOnMount,
}: {
  children: ReactNode
  description?: ReactNode
  focusOnMount: boolean
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])

  return (
    <div className="flex flex-col gap-1.5 text-center">
      <h2 ref={ref} tabIndex={-1} className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {children}
      </h2>
      {description && (
        <p className="text-sm text-pretty text-fg-muted sm:text-base">{description}</p>
      )}
    </div>
  )
}
