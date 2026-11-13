import { APP_NAME } from '@/lib/constants'
import { Faq } from './Faq'
import { FinalCta } from './FinalCta'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { PrivacySection } from './PrivacySection'
import { StyleGallery } from './StyleGallery'

export function LandingPage() {
  return (
    <>
      <title>{`${APP_NAME} — Turn your selfie into a stylized profile picture`}</title>
      <Hero />
      <StyleGallery />
      <HowItWorks />
      <PrivacySection />
      <Faq />
      <FinalCta />
    </>
  )
}
