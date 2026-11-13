import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_PIXELS } from '../constants'
import { preparePhoto } from './preparePhoto'

const decodeImage = vi.hoisted(() => vi.fn<(url: string) => Promise<HTMLImageElement>>())
vi.mock('./image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./image')>()),
  decodeImage,
}))

const decodesTo = (width: number, height: number) =>
  decodeImage.mockResolvedValue({ naturalWidth: width, naturalHeight: height } as HTMLImageElement)

const jpeg = (name = 'me.jpg', size = 2000) =>
  new File([new Uint8Array(size)], name, {
    type: name.endsWith('.heic') ? 'image/heic' : 'image/jpeg',
  })

beforeEach(() => {
  decodeImage.mockReset()
})

describe('preparePhoto', () => {
  it('returns the original blob with its decoded size and an object URL', async () => {
    decodesTo(1600, 1200)
    const file = jpeg()
    const photo = await preparePhoto(file, 'upload')

    expect(photo).toMatchObject({
      blob: file,
      width: 1600,
      height: 1200,
      source: 'upload',
      name: 'me.jpg',
    })
    expect(photo.url).toMatch(/^blob:/)
  })

  it('names camera captures', async () => {
    decodesTo(1080, 1080)
    const blob = new Blob([new Uint8Array(10)], { type: 'image/jpeg' })
    const photo = await preparePhoto(blob, 'camera')
    expect(photo.name).toMatch(/^selfie-\d+\.jpg$/)
  })

  it('rejects photos that are too small and releases the object URL', async () => {
    decodesTo(200, 900)
    await expect(preparePhoto(jpeg(), 'upload')).rejects.toMatchObject({ kind: 'too-small' })
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('rejects photos with too many pixels', async () => {
    decodesTo(10_000, Math.ceil(MAX_PIXELS / 10_000) + 1)
    await expect(preparePhoto(jpeg(), 'upload')).rejects.toMatchObject({ kind: 'too-many-pixels' })
  })

  it('reports undecodable HEIC as a browser limitation', async () => {
    decodeImage.mockRejectedValue(new Error('nope'))
    await expect(preparePhoto(jpeg('IMG_1.heic'), 'upload')).rejects.toMatchObject({
      kind: 'heic-unsupported',
    })
  })

  it('reports other undecodable files as decode failures', async () => {
    decodeImage.mockRejectedValue(new Error('nope'))
    await expect(preparePhoto(jpeg(), 'upload')).rejects.toMatchObject({ kind: 'decode-failed' })
  })

  it('rejects invalid files before decoding them', async () => {
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' })
    await expect(preparePhoto(gif, 'upload')).rejects.toMatchObject({ kind: 'unsupported-type' })
    expect(decodeImage).not.toHaveBeenCalled()
  })
})
