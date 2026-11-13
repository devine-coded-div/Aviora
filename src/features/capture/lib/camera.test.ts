import { afterEach, describe, expect, it } from 'vitest'
import { domError, fakeStream, mockMediaDevices, removeMediaDevices } from '@/test/media'
import {
  CameraError,
  facingOf,
  getCameraBlocker,
  openCamera,
  stopStream,
  toCameraError,
} from './camera'

afterEach(() => {
  removeMediaDevices()
})

describe('toCameraError', () => {
  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'not-found'],
    ['NotReadableError', 'in-use'],
    ['AbortError', 'in-use'],
    ['OverconstrainedError', 'overconstrained'],
    ['TypeError', 'unsupported'],
    ['SomethingNew', 'unknown'],
  ])('maps %s to %s', (name, kind) => {
    expect(toCameraError(domError(name)).kind).toBe(kind)
  })

  it('maps non-errors to unknown and passes CameraErrors through', () => {
    expect(toCameraError('boom').kind).toBe('unknown')
    const existing = new CameraError('not-found')
    expect(toCameraError(existing)).toBe(existing)
  })
})

describe('getCameraBlocker', () => {
  it('reports unsupported when mediaDevices is missing', () => {
    removeMediaDevices()
    expect(getCameraBlocker()).toBe('unsupported')
  })

  it('returns null when getUserMedia exists', () => {
    mockMediaDevices()
    expect(getCameraBlocker()).toBeNull()
  })
})

describe('openCamera', () => {
  it('requests video only, preferring the requested facing mode', async () => {
    const gum = mockMediaDevices()
    await openCamera('environment')
    const constraints = gum.mock.calls[0]![0]
    expect(constraints.audio).toBe(false)
    expect(constraints.video).toMatchObject({ facingMode: { ideal: 'environment' } })
  })

  it('retries with plain constraints when the device rejects resolution hints', async () => {
    const { stream } = fakeStream()
    const gum = mockMediaDevices({
      getUserMedia: (c) =>
        c.video === true
          ? Promise.resolve(stream)
          : Promise.reject(domError('OverconstrainedError')),
    })
    await expect(openCamera('user')).resolves.toBe(stream)
    expect(gum).toHaveBeenCalledTimes(2)
  })

  it('throws a typed error when permission is denied', async () => {
    mockMediaDevices({ getUserMedia: () => Promise.reject(domError('NotAllowedError')) })
    await expect(openCamera('user')).rejects.toMatchObject({ kind: 'permission-denied' })
  })

  it('fails fast without calling the API when unsupported', async () => {
    removeMediaDevices()
    await expect(openCamera('user')).rejects.toMatchObject({ kind: 'unsupported' })
  })
})

describe('stream helpers', () => {
  it('stops every track', () => {
    const { stream, track } = fakeStream()
    stopStream(stream)
    expect(track.stop).toHaveBeenCalledOnce()
    expect(() => stopStream(null)).not.toThrow()
  })

  it('reads the actual facing mode from the track', () => {
    expect(facingOf(fakeStream('environment').stream, 'user')).toBe('environment')
  })
})
