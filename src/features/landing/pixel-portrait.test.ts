import { describe, expect, it } from 'vitest'
import { PIXEL_GRID, PIXEL_PALETTE } from './pixel-portrait'

describe('pixel portrait', () => {
  it('is a 16×16 grid using only palette colours', () => {
    expect(PIXEL_GRID).toHaveLength(16)
    for (const row of PIXEL_GRID) {
      expect(row).toHaveLength(16)
      for (const cell of row) expect(PIXEL_PALETTE).toHaveProperty(cell)
    }
  })
})
