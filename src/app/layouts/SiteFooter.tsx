import { Link } from 'react-router'
import { Container, Logo } from '@/components/ui'
import { APP_NAME, NAV_LINKS, ROUTES } from '@/lib/constants'

// Evaluated once per page load; keeps render pure.
const currentYear = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 pb-[env(safe-area-inset-bottom)]">
      <Container className="grid gap-10 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-sm text-fg-muted">
            Stylized profile pictures for Instagram and every other place your face shows up.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-fg">Explore</h2>
          <ul className="mt-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.section}>
                <Link
                  to={{ pathname: ROUTES.home, hash: `#${link.section}` }}
                  className="inline-flex min-h-9 items-center text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-fg">Get started</h2>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              <Link
                to={ROUTES.studio}
                className="inline-flex min-h-9 items-center text-sm text-fg-muted transition-colors hover:text-fg"
              >
                Open the studio
              </Link>
            </li>
          </ul>
        </div>
      </Container>

      <Container className="flex flex-col gap-2 border-t border-border/70 py-6 text-xs text-fg-subtle sm:flex-row sm:justify-between">
        <p>
          © {currentYear} {APP_NAME}. All rights reserved.
        </p>
        <p>Style examples on this page are illustrations, not AI output.</p>
      </Container>
    </footer>
  )
}
