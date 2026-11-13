import { Camera, Download, Frame, WandSparkles, type LucideIcon } from 'lucide-react'
import { Container, SectionHeading } from '@/components/ui'
import { SECTION_IDS } from '@/lib/constants'
import { HOW_IT_WORKS, type Step } from '../content'

const icons: Record<Step['icon'], LucideIcon> = {
  camera: Camera,
  wand: WandSparkles,
  frame: Frame,
  download: Download,
}

export function HowItWorks() {
  const headingId = `${SECTION_IDS.howItWorks}-title`
  return (
    <section
      id={SECTION_IDS.howItWorks}
      aria-labelledby={headingId}
      className="scroll-mt-20 border-y border-border/60 bg-surface/40 py-16 sm:py-24"
    >
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow="How it works"
          title="From selfie to profile picture in four steps"
          description="No design skills, no app to install. Everything happens in one screen."
        />

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => {
            const Icon = icons[step.icon]
            return (
              <li
                key={step.title}
                className="relative flex flex-col gap-3 rounded-(--radius-card) border border-border bg-surface p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-3xl font-semibold text-border-strong tabular-nums"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-semibold">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="text-sm text-pretty text-fg-muted">{step.description}</p>
              </li>
            )
          })}
        </ol>
      </Container>
    </section>
  )
}
