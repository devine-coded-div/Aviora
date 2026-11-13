import { Menu, Sparkles, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ButtonLink, Container, Logo } from '@/components/ui'
import { NAV_LINKS, ROUTES } from '@/lib/constants'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  // Close the mobile menu whenever navigation happens.
  const [lastKey, setLastKey] = useState(location.key)
  if (lastKey !== location.key) {
    setLastKey(location.key)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to={ROUTES.home} className="rounded-md" aria-label="AI Avatar Studio home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.section}>
                <Link
                  to={{ pathname: ROUTES.home, hash: `#${link.section}` }}
                  className="rounded-full px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink to={ROUTES.studio} variant="primary" size="sm" className="h-10 sm:h-9">
            <Sparkles aria-hidden="true" />
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create my avatar</span>
          </ButtonLink>

          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      <nav
        id={menuId}
        aria-label="Mobile"
        hidden={!menuOpen}
        className="border-t border-border/70 bg-canvas md:hidden"
      >
        <Container>
          <ul className="flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.section}>
                <Link
                  to={{ pathname: ROUTES.home, hash: `#${link.section}` }}
                  className="flex h-12 items-center rounded-lg px-3 text-base text-fg hover:bg-surface-raised"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </header>
  )
}
