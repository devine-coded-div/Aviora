import { describe, expect, it } from 'vitest'
import {
  AVATAR_STYLES,
  DEFAULT_STYLE_ID,
  getStyle,
  isStyleId,
  STYLE_CATEGORIES,
  stylesInCategory,
} from './catalog'

describe('style catalog', () => {
  it('has unique ids', () => {
    const ids = AVATAR_STYLES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every required category with at least one style', () => {
    expect(STYLE_CATEGORIES.map((c) => c.label)).toEqual([
      'Cartoon',
      'Anime',
      'Realistic',
      '2D',
      'Pixel Art',
    ])
    for (const category of STYLE_CATEGORIES) {
      expect(stylesInCategory(category.id).length).toBeGreaterThan(0)
    }
  })

  it('gives every style a name, description, thumbnail and sane mock settings', () => {
    for (const style of AVATAR_STYLES) {
      expect(style.name.trim()).not.toBe('')
      expect(style.description.length).toBeGreaterThan(10)
      expect(style.thumbnail.art).toBeTruthy()
      expect(style.mock.saturation).toBeGreaterThanOrEqual(0)
      expect(style.mock.contrast).toBeGreaterThan(0)
      expect(style.mock.brightness).toBeGreaterThan(0)
    }
  })

  it('uses at least two posterize levels wherever posterize is set', () => {
    const levels = AVATAR_STYLES.flatMap((s) => ('posterize' in s.mock ? [s.mock.posterize] : []))
    expect(levels.length).toBeGreaterThan(0)
    expect(levels.every((n) => n >= 2)).toBe(true)
  })

  it('looks styles up by id', () => {
    expect(getStyle(DEFAULT_STYLE_ID)?.id).toBe(DEFAULT_STYLE_ID)
    expect(getStyle('nope')).toBeUndefined()
    expect(isStyleId('pixel-8bit')).toBe(true)
    expect(isStyleId('nope')).toBe(false)
  })

  it('returns everything for "all"', () => {
    expect(stylesInCategory('all')).toHaveLength(AVATAR_STYLES.length)
  })
})
