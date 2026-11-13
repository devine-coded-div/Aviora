import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_STYLE_ID } from './catalog'
import { MOCK_PROVIDER_INFO } from './generation/mockProvider'
import { useStyleStore, type StyleResult } from './store'

const result = (url: string): StyleResult => ({
  blob: new Blob(),
  url,
  provider: MOCK_PROVIDER_INFO,
  createdAt: 1,
})

beforeEach(() => {
  useStyleStore.setState({ selectedId: DEFAULT_STYLE_ID, sourceUrl: null, results: {} })
})

describe('useStyleStore', () => {
  it('caches results per style for the current source', () => {
    const s = useStyleStore.getState()
    s.syncSource('blob:photo')
    s.setResult('blob:photo', 'anime-classic', result('blob:a'))
    s.setResult('blob:photo', 'pixel-8bit', result('blob:p'))
    expect(Object.keys(useStyleStore.getState().results)).toEqual(['anime-classic', 'pixel-8bit'])
  })

  it('replaces and revokes a regenerated result', () => {
    const s = useStyleStore.getState()
    s.syncSource('blob:photo')
    s.setResult('blob:photo', 'anime-classic', result('blob:a1'))
    s.setResult('blob:photo', 'anime-classic', result('blob:a2'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a1')
    expect(useStyleStore.getState().results['anime-classic']?.url).toBe('blob:a2')
  })

  it('drops all results when the source photo changes', () => {
    const s = useStyleStore.getState()
    s.syncSource('blob:one')
    s.setResult('blob:one', 'anime-classic', result('blob:a'))
    s.syncSource('blob:two')
    expect(useStyleStore.getState().results).toEqual({})
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a')
  })

  it('discards results that finish after the photo changed', () => {
    const s = useStyleStore.getState()
    s.syncSource('blob:new')
    s.setResult('blob:old', 'anime-classic', result('blob:stale'))
    expect(useStyleStore.getState().results).toEqual({})
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:stale')
  })

  it('keeps results when syncing the same source again', () => {
    const s = useStyleStore.getState()
    s.syncSource('blob:same')
    s.setResult('blob:same', 'anime-classic', result('blob:a'))
    s.syncSource('blob:same')
    expect(useStyleStore.getState().results['anime-classic']).toBeDefined()
  })
})
