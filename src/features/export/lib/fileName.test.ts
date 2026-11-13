import { describe, expect, it } from 'vitest'
import {
  buildFileName,
  defaultBaseName,
  MAX_BASE_LENGTH,
  sanitizeBaseName,
  slugify,
} from './fileName'

describe('file naming', () => {
  it('builds a default name from style and frame', () => {
    expect(defaultBaseName({ style: 'Anime Classic', frame: 'Neon' })).toBe(
      'avatar-anime-classic-neon',
    )
    expect(defaultBaseName({ style: undefined, frame: 'Solid ring' })).toBe('avatar-solid-ring')
    expect(defaultBaseName({ style: '8-bit', frame: 'No frame' })).toBe('avatar-8-bit')
  })

  it('appends size and the right extension', () => {
    expect(buildFileName('avatar-neon', 'png', 1080)).toBe('avatar-neon-1080x1080.png')
    expect(buildFileName('avatar-neon', 'jpeg', 1080)).toBe('avatar-neon-1080x1080.jpg')
  })

  it.each([
    ['My Insta Pic!!  2026', 'my-insta-pic-2026'],
    ['../../etc/passwd', 'etc-passwd'],
    ['Café Ünïcode', 'cafe-unicode'],
    ['   ', 'avatar'],
    ['🔥🔥', 'avatar'],
    ['already-clean_name', 'already-clean-name'],
  ])('sanitizes %j → %s', (input, expected) => {
    expect(sanitizeBaseName(input)).toBe(expected)
  })

  it('caps the length without leaving a trailing dash', () => {
    const long = sanitizeBaseName('word '.repeat(40))
    expect(long.length).toBeLessThanOrEqual(MAX_BASE_LENGTH)
    expect(long.endsWith('-')).toBe(false)
  })

  it('slugifies to lowercase ASCII', () => {
    expect(slugify('Pastel Dream')).toBe('pastel-dream')
  })
})
