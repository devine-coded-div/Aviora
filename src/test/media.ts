import { vi } from 'vitest'

/** A fake MediaStream with spy-able track.stop(). */
export function fakeStream(facingMode: 'user' | 'environment' = 'user') {
  const track = {
    kind: 'video',
    stop: vi.fn<() => void>(),
    getSettings: () => ({ facingMode }),
  }
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
  return { stream, track }
}

export function domError(name: string) {
  return new DOMException('mock', name)
}

interface MediaMockOptions {
  cameras?: number
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
}

/** Install navigator.mediaDevices for one test. Returns the getUserMedia spy. */
export function mockMediaDevices({ cameras = 1, getUserMedia }: MediaMockOptions = {}) {
  const gum = vi.fn<(c: MediaStreamConstraints) => Promise<MediaStream>>(
    getUserMedia ??
      ((c) => {
        const video = c.video as MediaTrackConstraints | boolean
        const facing =
          typeof video === 'object' &&
          typeof video.facingMode === 'object' &&
          'ideal' in video.facingMode &&
          video.facingMode.ideal === 'environment'
            ? 'environment'
            : 'user'
        return Promise.resolve(fakeStream(facing).stream)
      }),
  )
  const devices = Array.from({ length: cameras }, (_, i) => ({
    kind: 'videoinput',
    deviceId: `cam-${i}`,
    label: '',
    groupId: '',
  }))
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: gum,
      enumerateDevices: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve(devices)),
    },
  })
  return gum
}

export function removeMediaDevices() {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
}
