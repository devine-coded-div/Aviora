import { RefreshCcw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui'
import { ROUTES } from '@/lib/constants'

/**
 * A page chunk that can't be fetched: the connection dropped, or the site was redeployed while
 * this tab was open and the old chunk no longer exists. Reloading fixes both.
 */
function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /dynamically imported module|importing a module script failed|error loading dynamically/i.test(
      error.message,
    )
  )
}

/** Last-resort error screen for anything thrown while rendering or loading a route. */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const chunk = isChunkLoadError(error)

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">
        {chunk ? 'This page couldn’t load' : 'Something went wrong'}
      </h1>
      <p className="text-sm text-fg-muted">
        {chunk
          ? 'Check your connection and reload. If the site was just updated, reloading gets the latest version.'
          : 'The page failed to load. Try again, or head back to the start.'}
      </p>
      {import.meta.env.DEV && (
        <pre className="overflow-auto rounded-md bg-surface p-3 text-xs text-danger">{message}</pre>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
          <RefreshCcw aria-hidden="true" />
          Reload page
        </Button>
        <Link
          to={ROUTES.home}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
