import { create } from 'zustand'
import { DEFAULT_STYLE_ID, type StyleId } from './catalog'
import type { ProviderInfo } from './generation/types'

export interface StyleResult {
  blob: Blob
  url: string
  provider: ProviderInfo
  createdAt: number
}

/**
 * Selected style and generated results, cached per style for the current cropped photo.
 * In memory only. Results are discarded (and their object URLs revoked) when the photo changes.
 */
export interface StyleState {
  selectedId: StyleId
  /** URL of the cropped photo the cached results were generated from. */
  sourceUrl: string | null
  results: Partial<Record<StyleId, StyleResult>>
  select: (id: StyleId) => void
  /** Call with the current cropped photo URL; clears results if it changed. */
  syncSource: (url: string) => void
  /** Stores a result if it still belongs to the current source; otherwise discards it. */
  setResult: (sourceUrl: string, id: StyleId, result: StyleResult) => void
  reset: () => void
}

function revokeAll(results: StyleState['results']) {
  for (const result of Object.values(results)) if (result) URL.revokeObjectURL(result.url)
}

export const useStyleStore = create<StyleState>()((set, get) => ({
  selectedId: DEFAULT_STYLE_ID,
  sourceUrl: null,
  results: {},

  select: (id) => set({ selectedId: id }),

  syncSource: (url) => {
    const { sourceUrl, results } = get()
    if (sourceUrl === url) return
    revokeAll(results)
    set({ sourceUrl: url, results: {} })
  },

  setResult: (sourceUrl, id, result) => {
    const state = get()
    if (state.sourceUrl !== sourceUrl) {
      // The photo changed while this was generating; the result is stale.
      URL.revokeObjectURL(result.url)
      return
    }
    const previous = state.results[id]
    if (previous) URL.revokeObjectURL(previous.url)
    set({ results: { ...state.results, [id]: result } })
  },

  reset: () => {
    revokeAll(get().results)
    set({ selectedId: DEFAULT_STYLE_ID, sourceUrl: null, results: {} })
  },
}))
