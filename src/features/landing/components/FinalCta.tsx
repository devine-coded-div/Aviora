import { ArrowRight } from 'lucide-react'
import { ButtonLink, Container } from '@/components/ui'
import { ROUTES } from '@/lib/constants'
import { AvatarArt, AvatarFrame } from '@/components/avatar'

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="py-16 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(ellipse_at_bottom,rgb(124_58_237/0.35),transparent_70%)] px-6 py-14 text-center sm:px-12">
          <div aria-hidden="true" className="mb-8 flex items-center justify-center -space-x-4">
            <AvatarFrame frame="gradient" className="w-16 sm:w-20">
              <AvatarArt variant="cartoon" />
            </AvatarFrame>
            <AvatarFrame frame="neon" className="z-10 w-20 sm:w-24">
              <AvatarArt variant="anime" />
            </AvatarFrame>
            <AvatarFrame frame="flame" className="w-16 sm:w-20">
              <AvatarArt variant="pixel" />
            </AvatarFrame>
          </div>
          <h2
            id="final-cta-title"
            className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Ready for a profile picture that stands out?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-fg-muted">
            Start with any photo. It's free to try and takes about a minute.
          </p>
          <ButtonLink to={ROUTES.studio} variant="gradient" size="lg" className="mt-8">
            Create my avatar
            <ArrowRight aria-hidden="true" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
