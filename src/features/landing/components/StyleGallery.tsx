import { Crown } from 'lucide-react'
import { Badge, Container, SectionHeading } from '@/components/ui'
import { SECTION_IDS } from '@/lib/constants'
import { FRAME_SHOWCASE, STYLE_SHOWCASE } from '../content'
import { AvatarArt } from './AvatarArt'
import { AvatarFrame } from './AvatarFrame'

export function StyleGallery() {
  const headingId = `${SECTION_IDS.styles}-title`
  return (
    <section
      id={SECTION_IDS.styles}
      aria-labelledby={headingId}
      className="scroll-mt-20 py-16 sm:py-24"
    >
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow="Styles"
          title="Five looks, one tap apart"
          description="Switch styles in a tap and compare them side by side before you decide."
        />

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
          {STYLE_SHOWCASE.map((style) => (
            <li key={style.id} className="last:odd:col-span-2 md:last:odd:col-span-1">
              <article className="flex h-full flex-col items-center gap-4 rounded-(--radius-card) border border-border bg-surface p-4 text-center shadow-card transition-colors hover:border-border-strong sm:p-5">
                <AvatarFrame frame={style.frame} className="w-full max-w-36">
                  <AvatarArt variant={style.id} />
                </AvatarFrame>
                <div className="flex flex-col items-center gap-1.5">
                  <h3 className="flex items-center gap-2 font-semibold">{style.name}</h3>
                  {style.premium && (
                    <Badge tone="premium">
                      <Crown aria-hidden="true" />
                      Premium
                    </Badge>
                  )}
                  <p className="text-sm text-pretty text-fg-muted">{style.description}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-(--radius-card) border border-border bg-surface/60 p-6 sm:p-8">
          <h3 className="text-lg font-semibold">Finish it with a frame</h3>
          <p className="mt-1 text-sm text-fg-muted">
            Every style works with every frame and background.
          </p>
          <ul className="mt-6 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
            {FRAME_SHOWCASE.map((frame) => (
              <li key={frame.id} className="flex flex-col items-center gap-2">
                <AvatarFrame frame={frame.id} className="w-full max-w-20">
                  <AvatarArt variant="illustration" />
                </AvatarFrame>
                <span className="text-xs font-medium text-fg-muted sm:text-sm">{frame.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          Examples are illustrations made for this page. Your results will depend on your photo.
        </p>
      </Container>
    </section>
  )
}
