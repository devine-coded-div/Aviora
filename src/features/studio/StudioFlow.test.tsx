import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePhotoStore } from '@/features/capture'
import { useStyleStore } from '@/features/styles'
import { ROUTES } from '@/lib/constants'
import { renderRoute } from '@/test/renderRoute'

beforeEach(() => {
  usePhotoStore.setState({
    original: {
      blob: new Blob(['o']),
      url: 'blob:test/original',
      width: 1600,
      height: 1200,
      source: 'upload',
      name: 'me.jpg',
    },
    crop: { area: { x: 0, y: 0, width: 1200, height: 1200 }, position: { x: 0, y: 0 }, zoom: 1 },
    cropped: { blob: new Blob(['c']), url: 'blob:test/cropped', size: 1080, lowResolution: false },
  })
  useStyleStore.getState().reset()
  vi.mocked(URL.revokeObjectURL).mockClear()
})

describe('StudioFlow', () => {
  it('moves from the crop result to styles and back, keeping progress in sync', async () => {
    const { user } = renderRoute(ROUTES.studio)

    expect(screen.getByRole('heading', { name: 'Looking good' })).toBeInTheDocument()
    const progress = screen.getByRole('list', { name: 'Progress' })
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Crop')

    await user.click(screen.getByRole('button', { name: /choose a style/i }))

    expect(screen.getByRole('heading', { name: 'Choose a style' })).toHaveFocus()
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Style')
    expect(screen.getByRole('note')).toHaveTextContent(/not ai/i)

    await user.click(screen.getByRole('button', { name: 'Change photo' }))
    expect(screen.getByRole('heading', { name: 'Looking good' })).toHaveFocus()
  })

  it('shows the capture step when there is no photo yet', () => {
    usePhotoStore.getState().reset()
    renderRoute(ROUTES.studio)
    expect(screen.getByRole('heading', { name: 'Add your photo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /choose a style/i })).not.toBeInTheDocument()
  })
})
