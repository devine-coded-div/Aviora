export type FrameKind = 'none' | 'flame' | 'dark' | 'solid' | 'gradient' | 'neon' | 'minimal'

/**
 * Everything the renderer needs. Lengths are fractions of the square's side, so the same
 * settings render identically (just scaled) at any size — preview or 1080×1080 export.
 * Each preset uses a subset of these fields.
 */
export interface FrameSettings {
  kind: FrameKind
  /** Ring colour; gradient start; flame core; dark ring tone. */
  color: string
  /** Gradient end; flame tips. */
  color2: string
  /** Ring thickness as a fraction of the side. */
  thickness: number
  /** Opacity of the ring/effect layer, 0–1. */
  opacity: number
  /** Effect strength, 0–1: neon glow, flame height, dark-theme vignette. */
  effect: number
  /** Gradient direction in degrees. */
  angle: number
  /** Fills the square's corners (and the gap between photo and ring). */
  background: string
}

export type NumericKey = 'thickness' | 'opacity' | 'effect' | 'angle'
export type ColorKey = 'color' | 'color2' | 'background'

export interface RangeControl {
  type: 'range'
  key: NumericKey
  label: string
  min: number
  max: number
  step: number
  /** How the value is shown to users. */
  format: 'px1080' | 'percent' | 'degrees'
}

export interface ColorControl {
  type: 'color'
  key: ColorKey
  label: string
  swatches: readonly { value: string; name: string }[]
}

export type FrameControl = RangeControl | ColorControl

export interface FramePreset {
  kind: FrameKind
  name: string
  description: string
  defaults: FrameSettings
  controls: readonly FrameControl[]
}
