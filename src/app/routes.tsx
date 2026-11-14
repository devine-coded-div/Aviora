import type { RouteObject } from 'react-router'
import { ROUTES } from '@/lib/constants'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RootLayout } from './layouts/RootLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'

/**
 * Route table, kept separate from the browser router so tests can mount it in a memory router.
 * The studio (cropper, canvas renderer, billing) is loaded on demand, so the landing page
 * stays small.
 */
export const routes: RouteObject[] = [
  {
    path: ROUTES.home,
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: ROUTES.studio,
        lazy: async () => ({ Component: (await import('@/pages/StudioPage')).StudioPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
