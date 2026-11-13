import { create } from 'zustand'
import { DEFAULT_FRAME, getPreset, sanitize } from './presets'
import type { FrameKind, FrameSettings } from './types'

/** Changes to the same control within this window merge into one undo step (e.g. a slider drag). */
export const COALESCE_MS = 800
export const HISTORY_LIMIT = 50

export interface FrameState {
  present: FrameSettings
  past: FrameSettings[]
  future: FrameSettings[]
  /** Identifies the last change for coalescing; null forces a new history entry. */
  lastKey: string | null
  lastAt: number
  /** Switch preset (undoable). Loads that preset's defaults. */
  choosePreset: (kind: FrameKind) => void
  /**
   * Change settings (undoable). Consecutive updates with the same `key` inside COALESCE_MS
   * become a single undo step.
   */
  update: (patch: Partial<Omit<FrameSettings, 'kind'>>, key: string) => void
  /** Close the current coalescing window, e.g. when a slider is released. */
  commit: () => void
  undo: () => void
  redo: () => void
  /** Restore the current preset's defaults (undoable). */
  reset: () => void
}

/** Injectable clock for tests. */
export const clock = { now: () => Date.now() }

const same = (a: FrameSettings, b: FrameSettings) =>
  (Object.keys(a) as (keyof FrameSettings)[]).every((k) => a[k] === b[k])

export const useFrameStore = create<FrameState>()((set, get) => {
  /** Push `next` as a new present, recording history unless it's a coalesced change. */
  function apply(next: FrameSettings, key: string | null) {
    const state = get()
    const clean = sanitize(next)
    if (same(clean, state.present)) return
    const now = clock.now()
    const coalesce = key !== null && key === state.lastKey && now - state.lastAt < COALESCE_MS
    set({
      present: clean,
      past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key,
      lastAt: now,
    })
  }

  return {
    present: DEFAULT_FRAME,
    past: [],
    future: [],
    lastKey: null,
    lastAt: 0,

    choosePreset: (kind) => {
      if (kind === get().present.kind) return
      apply(getPreset(kind).defaults, null)
    },

    update: (patch, key) => apply({ ...get().present, ...patch }, key),

    commit: () => set({ lastKey: null }),

    undo: () => {
      const { past, present, future } = get()
      const previous = past.at(-1)
      if (!previous) return
      set({
        present: previous,
        past: past.slice(0, -1),
        future: [present, ...future],
        lastKey: null,
      })
    },

    redo: () => {
      const { past, present, future } = get()
      const next = future[0]
      if (!next) return
      set({ present: next, past: [...past, present], future: future.slice(1), lastKey: null })
    },

    reset: () => apply(getPreset(get().present.kind).defaults, null),
  }
})
