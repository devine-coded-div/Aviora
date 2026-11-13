import { Container } from '@/components/ui'
import { CaptureFlow } from '@/features/capture'
import { APP_NAME } from '@/lib/constants'

/** Avatar editor. Phase 2: photo capture/upload and cropping. Styles, frames and export follow. */
export function StudioPage() {
  return (
    <Container className="flex max-w-3xl flex-1 flex-col gap-6 py-8 sm:py-12">
      <title>{`Studio — ${APP_NAME}`}</title>
      <h1 className="sr-only">Studio</h1>
      <CaptureFlow />
    </Container>
  )
}
