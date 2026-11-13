import { ChevronDown } from 'lucide-react'
import { Container, SectionHeading } from '@/components/ui'
import { SECTION_IDS } from '@/lib/constants'
import { FAQS } from '../content'

/**
 * Native <details>/<summary> disclosure: keyboard and screen-reader support come from the browser,
 * it works without JavaScript, and in-page search can open collapsed answers.
 */
export function Faq() {
  const headingId = `${SECTION_IDS.faq}-title`
  return (
    <section
      id={SECTION_IDS.faq}
      aria-labelledby={headingId}
      className="scroll-mt-20 border-y border-border/60 bg-surface/40 py-16 sm:py-24"
    >
      <Container className="max-w-3xl">
        <SectionHeading id={headingId} eyebrow="FAQ" title="Questions, answered" />

        <div className="mt-10 divide-y divide-(--color-border) rounded-(--radius-card) border border-border bg-surface">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition-colors hover:text-accent sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="text-base">{faq.question}</span>
                <ChevronDown
                  className="size-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-pretty text-fg-muted sm:px-6">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
