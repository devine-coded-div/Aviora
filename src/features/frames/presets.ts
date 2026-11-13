import type { ColorControl, FrameKind, FramePreset, FrameSettings, RangeControl } from './types'

const DARK_BACKGROUNDS = [
  { value: '#09090b', name: 'Black' },
  { value: '#18181b', name: 'Charcoal' },
  { value: '#1e1b4b', name: 'Midnight' },
  { value: '#052e16', name: 'Forest' },
] as const

const BRIGHT_BACKGROUNDS = [
  { value: '#09090b', name: 'Black' },
  { value: '#ffffff', name: 'White' },
  { value: '#fde68a', name: 'Butter' },
  { value: '#c4b5fd', name: 'Lavender' },
  { value: '#a7f3d0', name: 'Mint' },
] as const

const RING_COLORS = [
  { value: '#a78bfa', name: 'Violet' },
  { value: '#f472b6', name: 'Pink' },
  { value: '#34d399', name: 'Emerald' },
  { value: '#38bdf8', name: 'Sky' },
  { value: '#facc15', name: 'Gold' },
  { value: '#ffffff', name: 'White' },
] as const

const background = (swatches: ColorControl['swatches']): ColorControl => ({
  type: 'color',
  key: 'background',
  label: 'Background',
  swatches,
})

const thickness = (min: number, max: number, label = 'Thickness'): RangeControl => ({
  type: 'range',
  key: 'thickness',
  label,
  min,
  max,
  step: 0.002,
  format: 'px1080',
})

const opacity: RangeControl = {
  type: 'range',
  key: 'opacity',
  label: 'Opacity',
  min: 0.2,
  max: 1,
  step: 0.05,
  format: 'percent',
}

const base: FrameSettings = {
  kind: 'none',
  color: '#a78bfa',
  color2: '#f472b6',
  thickness: 0.04,
  opacity: 1,
  effect: 0.5,
  angle: 45,
  background: '#09090b',
}

/**
 * Frame catalog. Each preset declares its defaults and which controls it supports; the editor
 * UI and value clamping are generated from this data.
 */
export const FRAME_PRESETS: readonly FramePreset[] = [
  {
    kind: 'none',
    name: 'No frame',
    description: 'Just your avatar on a plain background.',
    defaults: { ...base, kind: 'none' },
    controls: [background(BRIGHT_BACKGROUNDS)],
  },
  {
    kind: 'flame',
    name: 'Flame',
    description: 'A ring of fire licking around your avatar.',
    defaults: {
      ...base,
      kind: 'flame',
      color: '#facc15',
      color2: '#ef4444',
      thickness: 0.02,
      effect: 0.6,
      background: '#09090b',
    },
    controls: [
      {
        type: 'color',
        key: 'color',
        label: 'Flame core',
        swatches: [
          { value: '#facc15', name: 'Yellow' },
          { value: '#a5f3fc', name: 'Ice' },
          { value: '#f0abfc', name: 'Orchid' },
          { value: '#bef264', name: 'Lime' },
        ],
      },
      {
        type: 'color',
        key: 'color2',
        label: 'Flame tips',
        swatches: [
          { value: '#ef4444', name: 'Red' },
          { value: '#3b82f6', name: 'Blue' },
          { value: '#7c3aed', name: 'Purple' },
          { value: '#16a34a', name: 'Green' },
        ],
      },
      {
        type: 'range',
        key: 'effect',
        label: 'Flame height',
        min: 0.2,
        max: 1,
        step: 0.05,
        format: 'percent',
      },
      thickness(0.008, 0.05, 'Base ring'),
      opacity,
      background(DARK_BACKGROUNDS),
    ],
  },
  {
    kind: 'dark',
    name: 'Dark theme',
    description: 'A moody dark ring with a soft vignette.',
    defaults: {
      ...base,
      kind: 'dark',
      color: '#3f3f46',
      thickness: 0.05,
      effect: 0.5,
      background: '#09090b',
    },
    controls: [
      {
        type: 'color',
        key: 'color',
        label: 'Ring tone',
        swatches: [
          { value: '#3f3f46', name: 'Graphite' },
          { value: '#27272a', name: 'Iron' },
          { value: '#312e81', name: 'Indigo' },
          { value: '#7f1d1d', name: 'Oxblood' },
        ],
      },
      {
        type: 'range',
        key: 'effect',
        label: 'Vignette',
        min: 0,
        max: 1,
        step: 0.05,
        format: 'percent',
      },
      thickness(0.01, 0.08),
      opacity,
      background(DARK_BACKGROUNDS),
    ],
  },
  {
    kind: 'solid',
    name: 'Solid ring',
    description: 'A clean ring in any colour.',
    defaults: { ...base, kind: 'solid', color: '#34d399', thickness: 0.035, background: '#09090b' },
    controls: [
      { type: 'color', key: 'color', label: 'Ring colour', swatches: RING_COLORS },
      thickness(0.008, 0.08),
      opacity,
      background(BRIGHT_BACKGROUNDS),
    ],
  },
  {
    kind: 'gradient',
    name: 'Gradient',
    description: 'A ring that blends between two colours.',
    defaults: {
      ...base,
      kind: 'gradient',
      color: '#facc15',
      color2: '#db2777',
      thickness: 0.035,
      angle: 45,
      background: '#09090b',
    },
    controls: [
      { type: 'color', key: 'color', label: 'Start colour', swatches: RING_COLORS },
      {
        type: 'color',
        key: 'color2',
        label: 'End colour',
        swatches: [
          { value: '#db2777', name: 'Magenta' },
          { value: '#7c3aed', name: 'Purple' },
          { value: '#2563eb', name: 'Blue' },
          { value: '#059669', name: 'Teal' },
        ],
      },
      {
        type: 'range',
        key: 'angle',
        label: 'Direction',
        min: 0,
        max: 360,
        step: 15,
        format: 'degrees',
      },
      thickness(0.008, 0.08),
      opacity,
      background(BRIGHT_BACKGROUNDS),
    ],
  },
  {
    kind: 'neon',
    name: 'Neon',
    description: 'A glowing tube of light.',
    defaults: {
      ...base,
      kind: 'neon',
      color: '#a78bfa',
      thickness: 0.016,
      effect: 0.6,
      background: '#09090b',
    },
    controls: [
      { type: 'color', key: 'color', label: 'Neon colour', swatches: RING_COLORS },
      {
        type: 'range',
        key: 'effect',
        label: 'Glow',
        min: 0,
        max: 1,
        step: 0.05,
        format: 'percent',
      },
      thickness(0.006, 0.04),
      opacity,
      background(DARK_BACKGROUNDS),
    ],
  },
  {
    kind: 'minimal',
    name: 'Minimal',
    description: 'A fine hairline border.',
    defaults: {
      ...base,
      kind: 'minimal',
      color: '#ffffff',
      thickness: 0.006,
      background: '#09090b',
    },
    controls: [
      { type: 'color', key: 'color', label: 'Line colour', swatches: RING_COLORS },
      thickness(0.002, 0.016, 'Line weight'),
      opacity,
      background(BRIGHT_BACKGROUNDS),
    ],
  },
]

const byKind = new Map(FRAME_PRESETS.map((p) => [p.kind, p]))

export function getPreset(kind: FrameKind): FramePreset {
  const preset = byKind.get(kind)
  if (!preset) throw new Error(`Unknown frame kind: ${kind}`)
  return preset
}

export const DEFAULT_FRAME: FrameSettings = getPreset('neon').defaults

const HEX = /^#[0-9a-f]{6}$/i

/** Clamp numbers to the preset's control ranges and reject malformed colours. */
export function sanitize(settings: FrameSettings): FrameSettings {
  const preset = getPreset(settings.kind)
  const next = { ...settings }
  for (const control of preset.controls) {
    if (control.type === 'range') {
      const value = Number.isFinite(next[control.key])
        ? next[control.key]
        : preset.defaults[control.key]
      next[control.key] = Math.min(control.max, Math.max(control.min, value))
    } else if (!HEX.test(next[control.key])) {
      next[control.key] = preset.defaults[control.key]
    }
  }
  return next
}
