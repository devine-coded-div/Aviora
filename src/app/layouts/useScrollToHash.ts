import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * Restores expected browser behaviour for client-side navigation:
 * - `/#section` scrolls to the section and moves keyboard/screen-reader focus to it.
 * - Any other navigation starts at the top of the page.
 * Runs on every navigation (each one yields a new location object), so clicking the same anchor
 * twice still scrolls.
 */
export function useScrollToHash() {
  const location = useLocation()

  useEffect(() => {
    const { hash } = location
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!target) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })

    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }, [location])
}
