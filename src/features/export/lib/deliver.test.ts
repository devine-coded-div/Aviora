import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShareFiles, downloadBlob, formatBytes, shareBlob } from './deliver'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('downloadBlob', () => {
  it('clicks a temporary download link and releases the URL later', () => {
    vi.useFakeTimers()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('avatar-1080x1080.png')
      expect(this.href).toMatch(/^blob:/)
      expect(document.body.contains(this)).toBe(true)
    })
    downloadBlob(new Blob(['x'], { type: 'image/png' }), 'avatar-1080x1080.png')

    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download]')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
  })
})

describe('sharing', () => {
  it('is unavailable without navigator.canShare', () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined })
    expect(canShareFiles()).toBe(false)
  })

  it('is available when the browser can share files', () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true })
    expect(canShareFiles()).toBe(true)
  })

  it('shares the image as a named file', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(() => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, share })
    await expect(shareBlob(new Blob(['x'], { type: 'image/png' }), 'a.png')).resolves.toBe(true)
    const file = share.mock.calls[0]![0].files![0]!
    expect(file.name).toBe('a.png')
    expect(file.type).toBe('image/png')
  })

  it('treats a dismissed share sheet as "not shared", not an error', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      share: () => Promise.reject(new DOMException('cancel', 'AbortError')),
    })
    await expect(shareBlob(new Blob(['x']), 'a.png')).resolves.toBe(false)
  })
})

describe('formatBytes', () => {
  it.each([
    [500, '500 B'],
    [2048, '2 KB'],
    [453484, '443 KB'],
    [3 * 1024 * 1024, '3.0 MB'],
  ])('%d → %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text)
  })
})
