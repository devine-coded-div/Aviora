import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Badge, ButtonLink, Container } from '@/components/ui'
import { ROUTES, SECTION_IDS } from '@/lib/constants'
import { PLATFORMS } from '../content'
import { AvatarArt, AvatarFrame } from '@/components/avatar'

const highlights = ['No sign-up to try', '1080 × 1080 export', 'Works on any phone']

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,rgb(124_58_237/0.28),transparent_65%)]"
      />
      <Container className="grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-24 lg:pb-24">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <Badge tone="accent">
            <Sparkles aria-hidden="true" />
            Profile picture studio
          </Badge>

          <h1
            id="hero-title"
            className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            Your selfie, turned into a <span className="text-gradient">profile picture</span> people
            remember
          </h1>

          <p className="max-w-xl text-lg text-pretty text-fg-muted">
            Snap or upload a photo, choose a cartoon, anime, realistic, illustrated or pixel-art
            style, and finish it with a neon ring, flames or a clean border. Download it ready for
            Instagram in under a minute.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink
              to={ROUTES.studio}
              variant="gradient"
              size="lg"
              className="w-full sm:w-auto"
            >
              Create my avatar
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              to={{ pathname: ROUTES.home, hash: `#${SECTION_IDS.styles}` }}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Browse styles
            </ButtonLink>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-fg-muted lg:justify-start">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <ProfileMock />
      </Container>

      <Container className="pb-12 sm:pb-16">
        <p className="text-center text-xs font-medium tracking-wide text-fg-subtle uppercase">
          Sized for every profile
        </p>
        <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-fg-muted sm:text-base">
          {PLATFORMS.map((platform) => (
            <li key={platform}>{platform}</li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/** Mock profile header showing a finished avatar in a circular crop. Decorative details are hidden. */
function ProfileMock() {
  return (
    <figure className="relative mx-auto w-full max-w-sm">
      <div className="rounded-[2rem] border border-border bg-surface/80 p-6 shadow-card backdrop-blur sm:p-8">
        <div className="flex items-center gap-5 sm:gap-6">
          <AvatarFrame frame="neon" className="w-24 sm:w-32">
            <AvatarArt variant="anime" />
          </AvatarFrame>
          <dl aria-hidden="true" className="grid flex-1 grid-cols-3 gap-3 text-center">
            {[
              ['248', 'posts'],
              ['12.4k', 'followers'],
              ['312', 'following'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-xs text-fg-muted">{label}</dt>
                <dd className="text-base font-semibold sm:text-lg">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div aria-hidden="true" className="mt-5 flex flex-col gap-1">
          <p className="font-semibold">Maya Chen</p>
          <p className="text-sm text-fg-muted">Illustrator · coffee · late-night sketches</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="rounded-lg bg-surface-raised py-2 text-center text-sm font-medium">
              Following
            </span>
            <span className="rounded-lg bg-surface-raised py-2 text-center text-sm font-medium">
              Message
            </span>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute -top-4 -right-2 animate-float rounded-full border border-border bg-surface-raised/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur sm:-right-6"
      >
        Anime · Neon ring
      </div>
      <div
        aria-hidden="true"
        className="absolute -bottom-4 -left-2 animate-float rounded-full border border-border bg-surface-raised/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur [animation-delay:-3s] sm:-left-6"
      >
        1080 × 1080 · PNG
      </div>

      <figcaption className="sr-only">
        Example: an anime-style avatar with a neon ring, shown on a social profile.
      </figcaption>
    </figure>
  )
}
