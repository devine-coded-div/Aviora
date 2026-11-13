import type { FrameSettings } from './types'

/**
 * The circular safe area is the circle inscribed in the square (radius 0.5 of the side):
 * that's what Instagram and most platforms show. Every frame is laid out so that nothing it
 * draws extends past that circle, at any setting.
 */
export const SAFE_RADIUS = 0.5
/** Keeps antialiased edges inside the safe circle. */
const EDGE = 0.004

/** Radii as fractions of the side, measured from the centre. */
export interface NormalizedLayout {
  photo: number
  ringInner: number
  ringOuter: number
  /** Furthest any drawn effect (glow, flames) can reach. Always ≤ SAFE_RADIUS. */
  effectOuter: number
  /** Neon glow reach beyond the ring, or flame height. 0 for other kinds. */
  effectReach: number
}

export function neonReach(effect: number): number {
  return 0.008 + effect * 0.05
}

export function flameReach(effect: number): number {
  return 0.03 + effect * 0.09
}

export function normalizedLayout(s: FrameSettings): NormalizedLayout {
  const t = s.thickness
  switch (s.kind) {
    case 'none':
      return {
        photo: SAFE_RADIUS,
        ringInner: SAFE_RADIUS,
        ringOuter: SAFE_RADIUS,
        effectOuter: SAFE_RADIUS,
        effectReach: 0,
      }
    case 'neon': {
      const reach = neonReach(s.effect)
      const ringOuter = SAFE_RADIUS - EDGE - reach
      return {
        photo: ringOuter - t - 0.014,
        ringInner: ringOuter - t,
        ringOuter,
        effectOuter: ringOuter + reach,
        effectReach: reach,
      }
    }
    case 'flame': {
      const reach = flameReach(s.effect)
      const ringOuter = SAFE_RADIUS - EDGE - reach
      return {
        photo: ringOuter - t,
        ringInner: ringOuter - t,
        ringOuter,
        effectOuter: ringOuter + reach,
        effectReach: reach,
      }
    }
    case 'solid':
    case 'gradient': {
      const ringOuter = SAFE_RADIUS - EDGE
      return {
        photo: ringOuter - t - 0.012,
        ringInner: ringOuter - t,
        ringOuter,
        effectOuter: ringOuter,
        effectReach: 0,
      }
    }
    case 'dark':
    case 'minimal': {
      const ringOuter = SAFE_RADIUS - EDGE
      return {
        photo: ringOuter - t,
        ringInner: ringOuter - t,
        ringOuter,
        effectOuter: ringOuter,
        effectReach: 0,
      }
    }
  }
}

/** Layout in pixels for a square of `size`. */
export function pixelLayout(s: FrameSettings, size: number) {
  const n = normalizedLayout(s)
  return {
    center: size / 2,
    photo: n.photo * size,
    ringInner: n.ringInner * size,
    ringOuter: n.ringOuter * size,
    effectOuter: n.effectOuter * size,
    effectReach: n.effectReach * size,
  }
}

export type PixelLayout = ReturnType<typeof pixelLayout>

/** Small seeded PRNG (mulberry32) so "random" flame shapes are identical on every render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const FLAME_SEED = 0x5eed
export const FLAME_COUNT = 30

export interface FlameTongue {
  /** Centre angle in radians. */
  angle: number
  /** Half the angular width at the base, radians. */
  halfWidth: number
  /** Height as a fraction of the flame reach (0.6–1). */
  height: number
  /** Sideways lean of the tip, radians. */
  lean: number
}

/** Flame tongue shapes. Depend only on the seed — never on size — so they scale exactly. */
export function flameTongues(count = FLAME_COUNT, seed = FLAME_SEED): FlameTongue[] {
  const rand = seededRandom(seed)
  const slice = (Math.PI * 2) / count
  return Array.from({ length: count }, (_, i) => ({
    angle: i * slice + (rand() - 0.5) * slice * 0.5,
    halfWidth: slice * (0.55 + rand() * 0.25),
    height: 0.6 + rand() * 0.4,
    lean: (rand() - 0.5) * slice * 0.6,
  }))
}
