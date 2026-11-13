import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FRAME } from '@/features/frames/presets'
import { renderAvatarImage } from './renderAvatarImage'

const drawAvatar = vi.hoisted(() => vi.fn<(...args: unknown[]) => void>())
vi.mock('@/features/frames', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/frames')>()),
  drawAvatar,
}))

const source = { image: {} as CanvasImageSource, width: 1080, height: 1080 }
const ctx = {} as CanvasRenderingContext2D
let canvas: HTMLCanvasElement
type ToBlob = (cb: BlobCallback, type?: string, quality?: unknown) => void
let toBlob: ReturnType<typeof vi.fn<ToBlob>>

beforeEach(() => {
  toBlob = vi.fn<ToBlob>((cb, type) =>
    cb(new Blob([new Uint8Array(10)], { type: type ?? 'image/png' })),
  )
  const create = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = create(tag)
    if (tag === 'canvas') {
      canvas = el as HTMLCanvasElement
      vi.spyOn(canvas, 'getContext').mockReturnValue(ctx)
      canvas.toBlob = toBlob as unknown as HTMLCanvasElement['toBlob']
    }
    return el
  })
})

describe('renderAvatarImage', () => {
  it('renders a 1080×1080 PNG with the shared renderer', async () => {
    const blob = await renderAvatarImage({
      settings: DEFAULT_FRAME,
      source,
      size: 1080,
      format: 'png',
      quality: 0.9,
    })

    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1080)
    expect(drawAvatar).toHaveBeenCalledWith(ctx, 1080, DEFAULT_FRAME, source)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined)
    expect(blob.type).toBe('image/png')
  })

  it('encodes JPEG with the chosen quality', async () => {
    await renderAvatarImage({
      settings: DEFAULT_FRAME,
      source,
      size: 1080,
      format: 'jpeg',
      quality: 0.85,
    })
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85)
  })

  it('fails clearly without a source image', async () => {
    await expect(
      renderAvatarImage({
        settings: DEFAULT_FRAME,
        source: null,
        size: 1080,
        format: 'png',
        quality: 1,
      }),
    ).rejects.toMatchObject({ kind: 'source-missing' })
  })

  it('fails clearly when the canvas has no 2D context', async () => {
    const create = document.createElement.bind(document)
    vi.mocked(document.createElement).mockImplementationOnce(() => {
      const el = create('canvas')
      vi.spyOn(el, 'getContext').mockReturnValue(null)
      return el
    })
    await expect(
      renderAvatarImage({ settings: DEFAULT_FRAME, source, size: 1080, format: 'png', quality: 1 }),
    ).rejects.toMatchObject({ kind: 'canvas-unavailable' })
  })

  it.each([
    ['no blob', (cb: BlobCallback) => cb(null)],
    [
      'wrong type (browser fell back to PNG)',
      (cb: BlobCallback) => cb(new Blob(['x'], { type: 'image/png' })),
    ],
    [
      'toBlob throws',
      () => {
        throw new Error('tainted')
      },
    ],
  ])('reports an encode failure: %s', async (_, impl) => {
    toBlob.mockImplementation(impl)
    await expect(
      renderAvatarImage({
        settings: DEFAULT_FRAME,
        source,
        size: 1080,
        format: 'jpeg',
        quality: 0.9,
      }),
    ).rejects.toMatchObject({ kind: 'encode-failed' })
  })
})
