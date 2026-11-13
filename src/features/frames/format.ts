import type { RangeControl } from './types'

/** User-facing value for a range control (thickness is shown in pixels at the 1080 export). */
export function formatValue(control: RangeControl, value: number): string {
  switch (control.format) {
    case 'px1080':
      return `${Math.max(1, Math.round(value * 1080))} px`
    case 'percent':
      return `${Math.round(value * 100)}%`
    case 'degrees':
      return `${Math.round(value)}°`
  }
}
