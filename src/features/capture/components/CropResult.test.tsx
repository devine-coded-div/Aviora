import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { isLowResolutionCrop } from '../lib/image'
import { LOW_RES_CROP_PX } from '../constants'
import { CropResult } from './CropResult'

const cropped = (lowResolution: boolean) => ({
  blob: new Blob(),
  url: 'blob:test/crop',
  size: 1080,
  lowResolution,
})

describe('CropResult', () => {
  it('shows the square crop and circular previews', () => {
    render(
      <CropResult
        cropped={cropped(false)}
        onContinue={vi.fn<() => void>()}
        onAdjust={vi.fn<() => void>()}
        onStartOver={vi.fn<() => void>()}
      />,
    )
    expect(screen.getByRole('img', { name: 'Your square crop' })).toHaveAttribute(
      'src',
      'blob:test/crop',
    )
    expect(screen.getByText('Square · 1080 × 1080')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('This crop is quite small')).not.toBeInTheDocument()
  })

  it('warns when the crop was upscaled from a small region', () => {
    render(
      <CropResult
        cropped={cropped(true)}
        onContinue={vi.fn<() => void>()}
        onAdjust={vi.fn<() => void>()}
        onStartOver={vi.fn<() => void>()}
      />,
    )
    expect(screen.getByText('This crop is quite small')).toBeInTheDocument()
  })
})

describe('isLowResolutionCrop', () => {
  it('flags crops narrower than the threshold', () => {
    expect(isLowResolutionCrop({ width: LOW_RES_CROP_PX - 1 })).toBe(true)
    expect(isLowResolutionCrop({ width: LOW_RES_CROP_PX })).toBe(false)
  })
})
