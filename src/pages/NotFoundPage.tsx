import { ArrowLeft } from 'lucide-react'
import { ButtonLink, Container } from '@/components/ui'
import { APP_NAME, ROUTES } from '@/lib/constants'

export function NotFoundPage() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <title>{`Page not found — ${APP_NAME}`}</title>
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-fg-muted">The page you're looking for doesn't exist.</p>
      <ButtonLink to={ROUTES.home} variant="secondary" className="mt-2">
        <ArrowLeft aria-hidden="true" />
        Back to home
      </ButtonLink>
    </Container>
  )
}
