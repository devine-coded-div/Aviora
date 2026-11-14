import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/lib/constants'
import { renderRoute } from '@/test/renderRoute'

/** The mobile menu, found through the toggle's aria-controls (it has no accessible name while hidden). */
function getMobileNav() {
  const toggle = screen.getByRole('button', { name: /(open|close) menu/i })
  const menu = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
  if (!menu) throw new Error('Mobile menu referenced by aria-controls not found')
  return menu
}

describe('SiteHeader', () => {
  it('keeps a Create CTA in the header that links to the studio', async () => {
    await renderRoute(ROUTES.home)
    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: /create/i })).toHaveAttribute('href', '/studio')
  })

  it('links primary nav items to landing sections from any page', async () => {
    await renderRoute(ROUTES.studio)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/#faq')
    expect(within(nav).getByRole('link', { name: 'Styles' })).toHaveAttribute('href', '/#styles')
  })

  it('opens and closes the mobile menu with the toggle button', async () => {
    const { user } = await renderRoute(ROUTES.home)
    const toggle = screen.getByRole('button', { name: 'Open menu' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(getMobileNav()).not.toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Close menu')
    expect(getMobileNav()).toBeVisible()
    expect(getMobileNav()).toHaveAccessibleName('Mobile')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the mobile menu on Escape and returns focus to the toggle', async () => {
    const { user } = await renderRoute(ROUTES.home)
    const toggle = screen.getByRole('button', { name: 'Open menu' })

    await user.click(toggle)
    await user.tab()
    await user.keyboard('{Escape}')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('closes the mobile menu after choosing a link and scrolls to that section', async () => {
    const { user, router } = await renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(within(getMobileNav()).getByRole('link', { name: 'How it works' }))

    expect(router.state.location.pathname).toBe(ROUTES.home)
    expect(router.state.location.hash).toBe('#how-it-works')
    expect(getMobileNav()).not.toBeVisible()

    const section = document.getElementById('how-it-works')
    expect(section?.scrollIntoView).toHaveBeenCalled()
    expect(section).toHaveFocus()
  })
})
