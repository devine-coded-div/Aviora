import type { AvatarArtStyle } from '@/components/avatar'

export type StyleCategory = 'cartoon' | 'anime' | 'realistic' | 'illustration' | 'pixel'

/**
 * Parameters for the on-device mock renderer. These are plain image adjustments —
 * they do not and cannot reproduce what an AI model would generate.
 */
export interface MockEffect {
  /** 1 = unchanged, 0 = greyscale. */
  saturation: number
  /** 1 = unchanged. */
  contrast: number
  /** 1 = unchanged. */
  brightness: number
  /** Colour levels per channel (2–255). Omit for none. */
  posterize?: number
  /** Number of pixel blocks across the image. Omit for none. */
  pixelate?: number
  /** Blend towards an RGB colour by `amount` (0–1). */
  tint?: { r: number; g: number; b: number; amount: number }
}

export interface AvatarStyle {
  id: string
  name: string
  category: StyleCategory
  description: string
  premium: boolean
  /** Illustrated thumbnail: one of the hand-drawn avatars plus an optional CSS filter for variety. */
  thumbnail: { art: AvatarArtStyle; filter?: string }
  mock: MockEffect
}
