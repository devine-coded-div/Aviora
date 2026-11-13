import type { RouteObject } from 'react-router'
import { ROUTES } from '@/lib/constants'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { StudioPage } from '@/pages/StudioPage'
import { RootLayout } from './layouts/RootLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'

/**
 * Route table, kept separate from the browser router so tests can mount it in a memory router.
 * Later phases can switch heavy routes (e.g. the editor) to `lazy` for code-splitting.
 */
export const routes: RouteObject[] = [
  {
    path: ROUTES.home,
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.studio, element: <StudioPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
