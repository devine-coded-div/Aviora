import { ArrowLeft, Camera, Upload } from 'lucide-react'
import { ButtonLink, Container } from '@/components/ui'
import { APP_NAME, ROUTES } from '@/lib/constants'

/**
 * Editor entry point. Placeholder until capture/upload (Phase 2), styles (Phase 3),
 * frames (Phase 4) and export (Phase 5) are built.
 */
export function StudioPage() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <title>{`Studio — ${APP_NAME}`}</title>
      <div aria-hidden="true" className="flex gap-3">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-surface-raised text-fg-muted">
          <Camera className="size-6" />
        </span>
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-surface-raised text-fg-muted">
          <Upload className="size-6" />
        </span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
      <p className="max-w-md text-pretty text-fg-muted">
        The avatar editor is being built. Taking a selfie and uploading a photo are coming next.
      </p>
      <ButtonLink to={ROUTES.home} variant="secondary">
        <ArrowLeft aria-hidden="true" />
        Back to home
      </ButtonLink>
    </Container>
  )
}
