import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_FRAME, getPreset } from './presets'
import { clock, COALESCE_MS, HISTORY_LIMIT, useFrameStore } from './store'

let now = 0
clock.now = () => now
const state = () => useFrameStore.getState()

beforeEach(() => {
  now = 1_000_000
  useFrameStore.setState({ present: DEFAULT_FRAME, past: [], future: [], lastKey: null, lastAt: 0 })
})

describe('frame history', () => {
  it('records changes and undoes/redoes them in order', () => {
    state().update({ color: '#ffffff' }, 'color')
    now += COALESCE_MS * 2
    state().update({ thickness: 0.03 }, 'thickness')
    expect(state().past).toHaveLength(2)

    state().undo()
    expect(state().present.thickness).toBe(DEFAULT_FRAME.thickness)
    expect(state().present.color).toBe('#ffffff')
    state().undo()
    expect(state().present).toEqual(DEFAULT_FRAME)
    expect(state().past).toHaveLength(0)

    state().redo()
    state().redo()
    expect(state().present).toMatchObject({ color: '#ffffff', thickness: 0.03 })
    expect(state().future).toHaveLength(0)
  })

  it('merges a slider drag into one undo step', () => {
    for (const t of [0.01, 0.015, 0.02, 0.025, 0.03]) {
      now += 50
      state().update({ thickness: t }, 'thickness')
    }
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().present.thickness).toBe(DEFAULT_FRAME.thickness)
  })

  it('starts a new step after commit (slider released) or a pause', () => {
    state().update({ thickness: 0.01 }, 'thickness')
    state().commit()
    state().update({ thickness: 0.02 }, 'thickness')
    now += COALESCE_MS + 1
    state().update({ thickness: 0.03 }, 'thickness')
    expect(state().past).toHaveLength(3)
  })

  it('starts a new step when a different control changes', () => {
    state().update({ thickness: 0.01 }, 'thickness')
    state().update({ opacity: 0.5 }, 'opacity')
    expect(state().past).toHaveLength(2)
  })

  it('ignores changes that don’t change anything', () => {
    state().update({ color: DEFAULT_FRAME.color }, 'color')
    expect(state().past).toHaveLength(0)
  })

  it('clamps values to the preset’s range', () => {
    state().update({ thickness: 99 }, 'thickness')
    expect(state().present.thickness).toBe(0.04)
  })

  it('makes preset switches and resets undoable', () => {
    state().choosePreset('flame')
    expect(state().present).toEqual(getPreset('flame').defaults)
    state().update({ effect: 1 }, 'effect')
    state().reset()
    expect(state().present).toEqual(getPreset('flame').defaults)

    state().undo()
    expect(state().present.effect).toBe(1)
    state().undo()
    state().undo()
    expect(state().present).toEqual(DEFAULT_FRAME)
  })

  it('clears redo after a new change', () => {
    state().update({ color: '#ffffff' }, 'color')
    state().undo()
    state().update({ opacity: 0.5 }, 'opacity')
    expect(state().future).toHaveLength(0)
  })

  it('caps history length', () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      state().update({ opacity: i % 2 ? 0.5 : 0.6 }, 'opacity')
      state().commit()
    }
    expect(state().past).toHaveLength(HISTORY_LIMIT)
  })

  it('does nothing when there is nothing to undo or redo', () => {
    state().undo()
    state().redo()
    expect(state().present).toEqual(DEFAULT_FRAME)
  })
})
