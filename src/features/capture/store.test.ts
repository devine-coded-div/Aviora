import { beforeEach, describe, expect, it } from 'vitest'
import { usePhotoStore } from './store'
import type { CroppedPhoto, CropSettings, SourcePhoto } from './types'

const photo = (url: string): SourcePhoto => ({
  blob: new Blob(),
  url,
  width: 1000,
  height: 1000,
  source: 'upload',
  name: 'a.jpg',
})
const cropped = (url: string): CroppedPhoto => ({
  blob: new Blob(),
  url,
  size: 1080,
  lowResolution: false,
})
const settings: CropSettings = {
  area: { x: 0, y: 0, width: 800, height: 800 },
  position: { x: 0, y: 0 },
  zoom: 1.2,
}

beforeEach(() => {
  usePhotoStore.setState({ original: null, crop: null, cropped: null })
})

describe('usePhotoStore', () => {
  it('keeps the original untouched alongside the crop', () => {
    const original = photo('blob:orig')
    usePhotoStore.getState().setOriginal(original)
    usePhotoStore.getState().setCrop(settings, cropped('blob:crop'))

    const state = usePhotoStore.getState()
    expect(state.original).toBe(original)
    expect(state.crop).toEqual(settings)
    expect(state.cropped?.url).toBe('blob:crop')
  })

  it('revokes old URLs and clears the crop when a new photo replaces the old one', () => {
    const store = usePhotoStore.getState()
    store.setOriginal(photo('blob:one'))
    store.setCrop(settings, cropped('blob:one-crop'))
    store.setOriginal(photo('blob:two'))

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one-crop')
    expect(usePhotoStore.getState()).toMatchObject({ crop: null, cropped: null })
  })

  it('revokes the previous crop when re-cropping', () => {
    const store = usePhotoStore.getState()
    store.setOriginal(photo('blob:o'))
    store.setCrop(settings, cropped('blob:c1'))
    store.setCrop(settings, cropped('blob:c2'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:c1')
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:o')
  })

  it('clearCropped keeps the original and crop settings', () => {
    const store = usePhotoStore.getState()
    store.setOriginal(photo('blob:o'))
    store.setCrop(settings, cropped('blob:c'))
    store.clearCropped()
    expect(usePhotoStore.getState()).toMatchObject({ crop: settings, cropped: null })
    expect(usePhotoStore.getState().original?.url).toBe('blob:o')
  })

  it('reset clears everything and revokes all URLs', () => {
    const store = usePhotoStore.getState()
    store.setOriginal(photo('blob:o'))
    store.setCrop(settings, cropped('blob:c'))
    store.reset()
    expect(usePhotoStore.getState()).toMatchObject({ original: null, crop: null, cropped: null })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:o')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:c')
  })
})
