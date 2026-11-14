import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { queryClient } from '../queryClient'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { useScrollToHash } from './useScrollToHash'

/** App shell: skip link, header, main landmark and footer. */
export function RootLayout() {
  useScrollToHash()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </main>

      <SiteFooter />
    </div>
  )
}
