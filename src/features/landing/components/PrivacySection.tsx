import { EyeOff, Lock, ShieldCheck, Smartphone, Trash2, type LucideIcon } from 'lucide-react'
import { Container, SectionHeading } from '@/components/ui'
import { SECTION_IDS } from '@/lib/constants'
import { PRIVACY_POINTS, type PrivacyPoint } from '../content'

const icons: Record<PrivacyPoint['icon'], LucideIcon> = {
  device: Smartphone,
  lock: Lock,
  'no-training': EyeOff,
  trash: Trash2,
}

export function PrivacySection() {
  const headingId = `${SECTION_IDS.privacy}-title`
  return (
    <section
      id={SECTION_IDS.privacy}
      aria-labelledby={headingId}
      className="scroll-mt-20 py-16 sm:py-24"
    >
      <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <SectionHeading
            id={headingId}
            align="left"
            eyebrow="Privacy"
            title="It's your face. You decide what happens to it."
            description="We built the studio so your photo does the minimum amount of travelling needed to make your avatar."
          />
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {PRIVACY_POINTS.map((point) => {
            const Icon = icons[point.icon]
            return (
              <li
                key={point.title}
                className="flex flex-col gap-3 rounded-(--radius-card) border border-border bg-surface p-6"
              >
                <Icon className="size-5 text-accent" aria-hidden="true" />
                <h3 className="font-semibold">{point.title}</h3>
                <p className="text-sm text-pretty text-fg-muted">{point.description}</p>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
