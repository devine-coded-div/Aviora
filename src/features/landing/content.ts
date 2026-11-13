/**
 * Landing page copy. Kept in one typed module so marketing text can change without touching layout.
 *
 * NOTE: privacy and FAQ answers describe the intended product behaviour. Before launch they must be
 * reviewed against the real backend (Phase 6) and payments (Phase 7) implementation and the
 * published privacy policy.
 */
import type { AvatarArtStyle, FrameStyle } from '@/components/avatar'

export interface StyleShowcase {
  id: AvatarArtStyle
  name: string
  description: string
  frame: FrameStyle
  premium: boolean
}

export const STYLE_SHOWCASE: readonly StyleShowcase[] = [
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Bold outlines and bright, friendly colour. Reads well at tiny sizes.',
    frame: 'gradient',
    premium: false,
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Expressive eyes and cel shading in a hand-drawn animation look.',
    frame: 'neon',
    premium: false,
  },
  {
    id: 'realistic',
    name: 'Realistic',
    description: 'Soft studio lighting and refined skin tones that still look like you.',
    frame: 'minimal',
    premium: true,
  },
  {
    id: 'illustration',
    name: '2D illustration',
    description: 'Flat shapes and a calm, editorial palette.',
    frame: 'solid',
    premium: false,
  },
  {
    id: 'pixel',
    name: 'Pixel art',
    description: 'A crisp 8-bit portrait for gaming and creator profiles.',
    frame: 'dark',
    premium: true,
  },
]

export interface FrameShowcase {
  id: FrameStyle
  name: string
}

export const FRAME_SHOWCASE: readonly FrameShowcase[] = [
  { id: 'flame', name: 'Flame' },
  { id: 'neon', name: 'Neon ring' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'solid', name: 'Solid colour' },
  { id: 'dark', name: 'Dark theme' },
  { id: 'minimal', name: 'Minimal border' },
]

export interface Step {
  title: string
  description: string
  icon: 'camera' | 'wand' | 'frame' | 'download'
}

export const HOW_IT_WORKS: readonly Step[] = [
  {
    icon: 'camera',
    title: 'Add your photo',
    description: 'Take a selfie with your camera or upload one you already like, then crop it.',
  },
  {
    icon: 'wand',
    title: 'Pick a style',
    description: 'Try cartoon, anime, realistic, 2D illustration or pixel art and compare results.',
  },
  {
    icon: 'frame',
    title: 'Frame it',
    description: 'Add a neon ring, flames, a gradient or a clean border and see it live.',
  },
  {
    icon: 'download',
    title: 'Download',
    description: 'Check it in a circular preview, then export a sharp 1080 × 1080 image.',
  },
]

export interface PrivacyPoint {
  title: string
  description: string
  icon: 'device' | 'lock' | 'trash' | 'no-training'
}

export const PRIVACY_POINTS: readonly PrivacyPoint[] = [
  {
    icon: 'device',
    title: 'Edits stay in your browser',
    description:
      'Cropping, framing and previewing happen on your device. Nothing is uploaded until you choose to generate a style.',
  },
  {
    icon: 'lock',
    title: 'Encrypted when it travels',
    description:
      'When you generate a style, your photo is sent over an encrypted connection and used only to create your avatar.',
  },
  {
    icon: 'no-training',
    title: 'Never used for training',
    description: 'Your photos and avatars are not used to train AI models.',
  },
  {
    icon: 'trash',
    title: 'You stay in control',
    description: 'No account is needed to try it, and you can delete your photos at any time.',
  },
]

export interface Faq {
  question: string
  answer: string
}

export const FAQS: readonly Faq[] = [
  {
    question: 'Is AI Avatar Studio free?',
    answer:
      'Yes. You can create, frame and download avatars with the core styles for free. Some premium styles and effects will be available as an optional upgrade.',
  },
  {
    question: 'Which photo works best?',
    answer:
      'A well-lit, front-facing photo where your face fills most of the frame. Avoid heavy filters, sunglasses or group shots.',
  },
  {
    question: 'What size is the download?',
    answer:
      'Avatars export as a 1080 × 1080 pixel square image — the size Instagram recommends — so they stay sharp everywhere.',
  },
  {
    question: 'Will it work for other platforms?',
    answer:
      'Yes. The square export works for TikTok, LinkedIn, X, YouTube, Discord, WhatsApp and most other profiles. Circular previews show how it will look once cropped.',
  },
  {
    question: 'Can I use it on my phone?',
    answer:
      'Yes. The studio is designed for mobile first and works in any modern browser on iOS, Android and desktop — there is nothing to install.',
  },
  {
    question: 'What happens to my photo?',
    answer:
      'Editing happens on your device. Your photo is only sent to our servers when you generate an AI style, it is never used for training, and you can delete it whenever you want.',
  },
]

export const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'X', 'YouTube', 'Discord'] as const
