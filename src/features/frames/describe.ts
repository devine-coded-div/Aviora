import { getPreset } from './presets'
import type { FrameSettings } from './types'

/** Short text alternative for the rendered avatar, built from the preset's own swatch names. */
export function describeFrame(s: FrameSettings): string {
  const preset = getPreset(s.kind)
  if (s.kind === 'none') return 'Your avatar with no frame'
  const colorControl = preset.controls.find((c) => c.type === 'color' && c.key === 'color')
  const colorName =
    colorControl?.type === 'color'
      ? (colorControl.swatches.find((w) => w.value.toLowerCase() === s.color.toLowerCase())?.name ??
        'custom colour')
      : null
  return `Your avatar with a ${preset.name.toLowerCase()} frame${colorName ? ` in ${colorName.toLowerCase()}` : ''}`
}
