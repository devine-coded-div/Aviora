import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { ROUTES } from '@/lib/constants'

/** Last-resort error screen for anything thrown while rendering a route. */
export function RouteErrorBoundary() {
  const error = useRouteError()

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-fg-muted">
        The page failed to load. Try again, or head back to the start.
      </p>
      {import.meta.env.DEV && (
        <pre className="overflow-auto rounded-md bg-surface p-3 text-xs text-danger">{message}</pre>
      )}
      <Link
        to={ROUTES.home}
        className="text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </div>
  )
}
