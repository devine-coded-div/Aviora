import type { AvatarStyle, StyleCategory } from './types'

/** Category order and labels for filters and grouping. */
export const STYLE_CATEGORIES: readonly { id: StyleCategory; label: string }[] = [
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'anime', label: 'Anime' },
  { id: 'realistic', label: 'Realistic' },
  { id: 'illustration', label: '2D' },
  { id: 'pixel', label: 'Pixel Art' },
]

/**
 * The avatar style catalog. Adding a style here is all that's needed for it to appear in the
 * picker; a real AI provider will map `id` to its own model/prompt configuration.
 */
export const AVATAR_STYLES = [
  {
    id: 'cartoon-bold',
    name: 'Bold Cartoon',
    category: 'cartoon',
    description: 'Punchy flat colour with a friendly, graphic feel.',
    premium: false,
    thumbnail: { art: 'cartoon' },
    mock: { saturation: 1.5, contrast: 1.25, brightness: 1.05, posterize: 5 },
  },
  {
    id: 'cartoon-comic',
    name: 'Comic Pop',
    category: 'cartoon',
    description: 'High-contrast comic-book colour with a warm pop.',
    premium: true,
    thumbnail: { art: 'cartoon', filter: 'saturate(1.6) contrast(1.15)' },
    mock: {
      saturation: 1.8,
      contrast: 1.4,
      brightness: 1,
      posterize: 4,
      tint: { r: 255, g: 200, b: 0, amount: 0.08 },
    },
  },
  {
    id: 'anime-classic',
    name: 'Anime Classic',
    category: 'anime',
    description: 'Clean cel shading and bright, expressive colour.',
    premium: false,
    thumbnail: { art: 'anime' },
    mock: { saturation: 1.3, contrast: 1.1, brightness: 1.08, posterize: 7 },
  },
  {
    id: 'anime-pastel',
    name: 'Pastel Dream',
    category: 'anime',
    description: 'Soft pastel tones with a gentle, airy glow.',
    premium: true,
    thumbnail: { art: 'anime', filter: 'hue-rotate(-40deg) saturate(0.8) brightness(1.05)' },
    mock: {
      saturation: 0.85,
      contrast: 0.95,
      brightness: 1.12,
      posterize: 8,
      tint: { r: 255, g: 182, b: 220, amount: 0.12 },
    },
  },
  {
    id: 'realistic-studio',
    name: 'Studio Portrait',
    category: 'realistic',
    description: 'Refined lighting and natural skin tones that still look like you.',
    premium: true,
    thumbnail: { art: 'realistic' },
    mock: {
      saturation: 1.05,
      contrast: 1.12,
      brightness: 1.02,
      tint: { r: 255, g: 220, b: 190, amount: 0.06 },
    },
  },
  {
    id: 'realistic-film',
    name: 'Film Look',
    category: 'realistic',
    description: 'Warm, slightly faded tones inspired by analogue film.',
    premium: true,
    thumbnail: { art: 'realistic', filter: 'sepia(0.35) saturate(0.9)' },
    mock: {
      saturation: 0.8,
      contrast: 1.05,
      brightness: 1.04,
      tint: { r: 255, g: 210, b: 160, amount: 0.15 },
    },
  },
  {
    id: 'flat-vector',
    name: 'Flat Vector',
    category: 'illustration',
    description: 'Simple shapes and a limited, modern palette.',
    premium: false,
    thumbnail: { art: 'illustration' },
    mock: { saturation: 1.2, contrast: 1.1, brightness: 1, posterize: 4 },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    category: 'illustration',
    description: 'Muted, cool tones like a magazine illustration.',
    premium: false,
    thumbnail: { art: 'illustration', filter: 'saturate(0.6) contrast(1.1)' },
    mock: {
      saturation: 0.6,
      contrast: 1.15,
      brightness: 1,
      posterize: 5,
      tint: { r: 40, g: 80, b: 120, amount: 0.12 },
    },
  },
  {
    id: 'pixel-8bit',
    name: '8-bit',
    category: 'pixel',
    description: 'Chunky pixels and a tiny palette, straight from a retro console.',
    premium: true,
    thumbnail: { art: 'pixel' },
    mock: { saturation: 1.3, contrast: 1.1, brightness: 1, posterize: 4, pixelate: 32 },
  },
  {
    id: 'pixel-16bit',
    name: '16-bit',
    category: 'pixel',
    description: 'Finer pixels and richer colour for a detailed sprite look.',
    premium: true,
    thumbnail: { art: 'pixel', filter: 'saturate(1.3) brightness(1.08)' },
    mock: { saturation: 1.2, contrast: 1.05, brightness: 1, posterize: 6, pixelate: 64 },
  },
] as const satisfies readonly AvatarStyle[]

export type StyleId = (typeof AVATAR_STYLES)[number]['id']

export const DEFAULT_STYLE_ID: StyleId = AVATAR_STYLES[0].id

const byId = new Map<string, AvatarStyle>(AVATAR_STYLES.map((style) => [style.id, style]))

export function getStyle(id: string): AvatarStyle | undefined {
  return byId.get(id)
}

export function isStyleId(id: string): id is StyleId {
  return byId.has(id)
}

export function stylesInCategory(category: StyleCategory | 'all'): readonly AvatarStyle[] {
  return category === 'all' ? AVATAR_STYLES : AVATAR_STYLES.filter((s) => s.category === category)
}

export function categoryLabel(category: StyleCategory): string {
  return STYLE_CATEGORIES.find((c) => c.id === category)?.label ?? category
}
