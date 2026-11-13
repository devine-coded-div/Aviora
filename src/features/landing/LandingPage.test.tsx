import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROUTES, SECTION_IDS } from '@/lib/constants'
import { axeViolations } from '@/test/axe'
import { renderRoute } from '@/test/renderRoute'
import { FAQS, HOW_IT_WORKS, PRIVACY_POINTS, STYLE_SHOWCASE } from './content'

function getSection(name: RegExp) {
  return screen.getByRole('region', { name })
}

describe('LandingPage', () => {
  it('has exactly one h1 and labelled sections for every nav target', () => {
    renderRoute(ROUTES.home)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const id of Object.values(SECTION_IDS)) {
      const section = document.getElementById(id)
      expect(section, `#${id}`).toBeInTheDocument()
      expect(section).toHaveAccessibleName()
    }
  })

  it('points every "Create my avatar" CTA at the studio', () => {
    renderRoute(ROUTES.home)

    const ctas = screen.getAllByRole('link', { name: /create my avatar/i })
    expect(ctas.length).toBeGreaterThanOrEqual(3) // header, hero, closing CTA
    for (const cta of ctas) expect(cta).toHaveAttribute('href', ROUTES.studio)
  })

  it('shows every avatar style, marks premium ones and labels examples as illustrations', () => {
    renderRoute(ROUTES.home)
    const gallery = getSection(/five looks/i)

    for (const style of STYLE_SHOWCASE) {
      expect(
        within(gallery).getByRole('heading', { level: 3, name: style.name }),
      ).toBeInTheDocument()
    }
    const premiumCount = STYLE_SHOWCASE.filter((s) => s.premium).length
    expect(within(gallery).getAllByText('Premium')).toHaveLength(premiumCount)
    expect(within(gallery).getByText(/illustrations made for this page/i)).toBeInTheDocument()
  })

  it('lists how-it-works steps in order', () => {
    renderRoute(ROUTES.home)
    const steps = within(getSection(/four steps/i)).getAllByRole('listitem')

    expect(steps).toHaveLength(HOW_IT_WORKS.length)
    steps.forEach((step, i) => expect(step).toHaveTextContent(HOW_IT_WORKS[i]!.title))
  })

  it('shows the privacy commitments', () => {
    renderRoute(ROUTES.home)
    const privacy = getSection(/your face/i)
    for (const point of PRIVACY_POINTS) {
      expect(within(privacy).getByRole('heading', { name: point.title })).toBeInTheDocument()
    }
  })

  it('expands FAQ answers on demand', async () => {
    const { user } = renderRoute(ROUTES.home)
    const faq = getSection(/questions, answered/i)
    const first = FAQS[0]!

    const summaries = faq.querySelectorAll('summary')
    expect(summaries).toHaveLength(FAQS.length)

    const details = summaries[0]!.closest('details')!
    expect(details.open).toBe(false)
    await user.click(within(faq).getByText(first.question))
    expect(details.open).toBe(true)
    expect(within(faq).getByText(first.answer)).toBeVisible()
  })

  it('has no detectable a11y violations', async () => {
    renderRoute(ROUTES.home)
    expect(await axeViolations()).toEqual([])
  })
})
