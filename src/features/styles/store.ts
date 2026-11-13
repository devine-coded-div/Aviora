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
  /**
   * Style to re-apply automatically after the photo changed. Set when the user had already
   * generated the selected style for the previous photo — changing the photo shouldn't lose it.
   */
  pendingId: StyleId | null
  select: (id: StyleId) => void
  /** The pending re-apply has been started (or no longer applies). */
  clearPending: () => void
  /**
   * Call with the current cropped photo URL. If it changed, cached results are dropped and, if
   * the selected style had been applied, it's queued to be re-applied to the new photo.
   */
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
  pendingId: null,

  select: (id) => set({ selectedId: id }),

  clearPending: () => set({ pendingId: null }),

  syncSource: (url) => {
    const { sourceUrl, results } = get()
    if (sourceUrl === url) return
    const { selectedId } = get()
    const wasApplied = sourceUrl !== null && results[selectedId] !== undefined
    revokeAll(results)
    set({ sourceUrl: url, results: {}, pendingId: wasApplied ? selectedId : null })
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
    set({
      results: { ...state.results, [id]: result },
      pendingId: state.pendingId === id ? null : state.pendingId,
    })
  },

  reset: () => {
    revokeAll(get().results)
    set({ selectedId: DEFAULT_STYLE_ID, sourceUrl: null, results: {}, pendingId: null })
  },
}))
