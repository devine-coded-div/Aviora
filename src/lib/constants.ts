export const APP_NAME = 'AI Avatar Studio'

/** Default export target: square, Instagram-friendly profile picture. */
export const DEFAULT_EXPORT_SIZE_PX = 1080

/** Central route paths so links and the router never drift apart. */
export const ROUTES = {
  home: '/',
  studio: '/studio',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/** Ids of landing page sections, used for in-page navigation (`/#styles`). */
export const SECTION_IDS = {
  styles: 'styles',
  howItWorks: 'how-it-works',
  privacy: 'privacy',
  faq: 'faq',
} as const

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS]

/** Primary navigation shared by the header and footer. */
export const NAV_LINKS: ReadonlyArray<{ label: string; section: SectionId }> = [
  { label: 'Styles', section: SECTION_IDS.styles },
  { label: 'How it works', section: SECTION_IDS.howItWorks },
  { label: 'Privacy', section: SECTION_IDS.privacy },
  { label: 'FAQ', section: SECTION_IDS.faq },
]
