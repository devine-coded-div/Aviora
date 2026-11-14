import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePhotoStore } from '@/features/capture'
import { MOCK_PROVIDER_INFO, useStyleStore } from '@/features/styles'
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
    const { user } = await renderRoute(ROUTES.studio)

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

  it('continues from styles to frames, framing the photo when no style was generated', async () => {
    const { user } = await renderRoute(ROUTES.studio)
    await user.click(screen.getByRole('button', { name: /choose a style/i }))
    await user.click(screen.getByRole('button', { name: 'Continue to frames' }))

    expect(screen.getByRole('heading', { name: 'Frame your avatar' })).toHaveFocus()
    const progress = screen.getByRole('list', { name: 'Progress' })
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Frame')
    expect(screen.getByText(/framing: your photo \(no style\)/i)).toBeInTheDocument()
    expect(screen.queryByText('Mock preview · not AI')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to styles' }))
    expect(screen.getByRole('heading', { name: 'Choose a style' })).toHaveFocus()
  })

  it('frames the selected style’s result, labelled as a mock', async () => {
    useStyleStore.setState({
      selectedId: 'anime-classic',
      sourceUrl: 'blob:test/cropped',
      results: {
        'anime-classic': {
          blob: new Blob(['s']),
          url: 'blob:test/anime',
          provider: MOCK_PROVIDER_INFO,
          createdAt: 1,
        },
      },
    })
    const { user } = await renderRoute(ROUTES.studio)
    await user.click(screen.getByRole('button', { name: /choose a style/i }))
    expect(screen.getByText('Uses your Anime Classic preview.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue to frames' }))

    expect(screen.getByText(/framing: anime classic style/i)).toBeInTheDocument()
    expect(screen.getAllByText('Mock preview · not AI').length).toBeGreaterThan(0)
  })

  it('continues from frames to preview & download and back', async () => {
    const { user } = await renderRoute(ROUTES.studio)
    await user.click(screen.getByRole('button', { name: /choose a style/i }))
    await user.click(screen.getByRole('button', { name: 'Continue to frames' }))
    await user.click(screen.getByRole('button', { name: 'Continue to download' }))

    expect(screen.getByRole('heading', { name: 'Preview and download' })).toHaveFocus()
    const progress = screen.getByRole('list', { name: 'Progress' })
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Download')
    expect(screen.getByRole('textbox', { name: 'File name' })).toHaveValue('avatar-neon')

    await user.click(screen.getByRole('button', { name: 'Back to frames' }))
    expect(screen.getByRole('heading', { name: 'Frame your avatar' })).toHaveFocus()
  })

  it('shows the capture step when there is no photo yet', async () => {
    usePhotoStore.getState().reset()
    await renderRoute(ROUTES.studio)
    expect(screen.getByRole('heading', { name: 'Add your photo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /choose a style/i })).not.toBeInTheDocument()
  })
})
