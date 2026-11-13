import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { APP_NAME, ROUTES } from '@/lib/constants'
import { axeViolations } from '@/test/axe'
import { renderRoute } from '@/test/renderRoute'

describe('app routing', () => {
  it('renders the landing page inside the app shell', () => {
    renderRoute(ROUTES.home)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/your selfie, turned into/i)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
  })

  it('sets a page title per route', async () => {
    renderRoute(ROUTES.home)
    await waitFor(() => expect(document.title).toMatch(new RegExp(`^${APP_NAME}`)))
  })

  it('takes the primary hero CTA to the studio', async () => {
    const { user, router } = renderRoute(ROUTES.home)

    const [heroCta] = screen.getAllByRole('link', { name: /create my avatar/i })
    await user.click(heroCta!)

    expect(router.state.location.pathname).toBe(ROUTES.studio)
    expect(screen.getByRole('heading', { level: 1, name: 'Studio' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe(`Studio — ${APP_NAME}`))
  })

  it('shows a not-found page for unknown routes', () => {
    renderRoute('/does-not-exist')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it.each([ROUTES.studio, '/does-not-exist'])(
    'has no detectable a11y violations on %s',
    async (path) => {
      renderRoute(path)
      expect(await axeViolations()).toEqual([])
    },
  )
})
