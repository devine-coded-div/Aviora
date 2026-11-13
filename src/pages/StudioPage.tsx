import { Container } from '@/components/ui'
import { StudioFlow } from '@/features/studio'
import { APP_NAME } from '@/lib/constants'

/** Avatar editor: photo → crop → style. Frames and export follow in later phases. */
export function StudioPage() {
  return (
    <Container className="flex max-w-5xl flex-1 flex-col gap-6 py-8 sm:py-12">
      <title>{`Studio — ${APP_NAME}`}</title>
      <h1 className="sr-only">Studio</h1>
      <StudioFlow />
    </Container>
  )
}
