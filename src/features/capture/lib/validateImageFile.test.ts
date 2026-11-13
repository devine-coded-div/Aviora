import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES } from '../constants'
import { resolveMimeType, validateImageFile } from './validateImageFile'

const file = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('validateImageFile', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
  ])('accepts %s', (name, type) => {
    expect(validateImageFile(file(name, type))).toEqual({ ok: true, isHeic: false })
  })

  it('accepts HEIC provisionally and flags it for a decode check', () => {
    expect(validateImageFile(file('IMG_0001.HEIC', 'image/heic'))).toEqual({
      ok: true,
      isHeic: true,
    })
  })

  it.each([
    ['anim.gif', 'image/gif'],
    ['vector.svg', 'image/svg+xml'],
    ['doc.pdf', 'application/pdf'],
    ['notes.txt', 'text/plain'],
    ['mystery', ''],
  ])('rejects %s as unsupported', (name, type) => {
    expect(validateImageFile(file(name, type))).toEqual({ ok: false, error: 'unsupported-type' })
  })

  it('rejects empty files', () => {
    expect(validateImageFile(file('a.jpg', 'image/jpeg', 0))).toEqual({ ok: false, error: 'empty' })
  })

  it('rejects files over the size limit, and accepts exactly at the limit', () => {
    expect(validateImageFile(file('a.jpg', 'image/jpeg', MAX_FILE_BYTES + 1))).toEqual({
      ok: false,
      error: 'too-large',
    })
    expect(validateImageFile(file('a.jpg', 'image/jpeg', MAX_FILE_BYTES)).ok).toBe(true)
  })
})

describe('resolveMimeType', () => {
  it('falls back to the extension when the browser reports no type', () => {
    expect(resolveMimeType({ name: 'IMG.HEIC', type: '' })).toBe('image/heic')
    expect(resolveMimeType({ name: 'pic.JPEG', type: '' })).toBe('image/jpeg')
  })

  it('prefers the reported type', () => {
    expect(resolveMimeType({ name: 'pic.png', type: 'IMAGE/JPEG' })).toBe('image/jpeg')
  })
})
