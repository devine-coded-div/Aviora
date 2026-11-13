import { create } from 'zustand'
import type { CroppedPhoto, CropSettings, SourcePhoto } from './types'

/**
 * Temporary, in-memory photo state shared across the editor (capture → styles → frames → export).
 * Deliberately not persisted: photos never touch storage or the network.
 * Object URLs are revoked whenever the photo they point to is replaced or cleared.
 */
export interface PhotoState {
  original: SourcePhoto | null
  crop: CropSettings | null
  cropped: CroppedPhoto | null
  setOriginal: (photo: SourcePhoto) => void
  setCrop: (crop: CropSettings, cropped: CroppedPhoto) => void
  /** Drop the rendered crop but keep settings, e.g. to re-open the cropper. */
  clearCropped: () => void
  reset: () => void
}

function revoke(url: string | undefined) {
  if (url) URL.revokeObjectURL(url)
}

export const usePhotoStore = create<PhotoState>()((set, get) => ({
  original: null,
  crop: null,
  cropped: null,

  setOriginal: (photo) => {
    const { original, cropped } = get()
    if (original?.url !== photo.url) revoke(original?.url)
    revoke(cropped?.url)
    set({ original: photo, crop: null, cropped: null })
  },

  setCrop: (crop, cropped) => {
    const previous = get().cropped
    if (previous?.url !== cropped.url) revoke(previous?.url)
    set({ crop, cropped })
  },

  clearCropped: () => {
    revoke(get().cropped?.url)
    set({ cropped: null })
  },

  reset: () => {
    const { original, cropped } = get()
    revoke(original?.url)
    revoke(cropped?.url)
    set({ original: null, crop: null, cropped: null })
  },
}))
