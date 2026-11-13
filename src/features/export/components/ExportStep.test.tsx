import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { DEFAULT_FRAME } from '@/features/frames/presets'
import { useFrameStore } from '@/features/frames/store'
import { axeViolations } from '@/test/axe'
import { exportDeps } from '../hooks/useExport'
import { ExportError } from '../types'
import { ExportStep } from './ExportStep'

// The avatar image is "loaded" immediately; decoding is covered elsewhere.
const loaded = {
  status: 'ready' as const,
  source: { image: {} as CanvasImageSource, width: 1080, height: 1080 },
}
vi.mock('@/features/frames/hooks/useSourceImage', () => ({ useSourceImage: () => loaded }))

const source = {
  url: 'blob:test/anime',
  label: 'Anime Classic style',
  isMock: true,
  styleName: 'Anime Classic',
}
const png = new Blob([new Uint8Array(2048)], { type: 'image/png' })

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Spies are recreated per test because the config restores mocks after each one.
let deps: {
  render: MockInstance<typeof exportDeps.renderAvatarImage>
  size: MockInstance<typeof exportDeps.readImageSize>
  download: MockInstance<typeof exportDeps.downloadBlob>
  share: MockInstance<typeof exportDeps.shareBlob>
}

async function setup(props: Partial<Parameters<typeof ExportStep>[0]> = {}) {
  const user = userEvent.setup()
  const onBack = vi.fn<() => void>()
  render(
    <main>
      <ExportStep source={source} onBack={onBack} focusOnMount {...props} />
    </main>,
  )
  await act(async () => {})
  return { user, onBack }
}

beforeEach(() => {
  useFrameStore.setState({ present: DEFAULT_FRAME, past: [], future: [], lastKey: null, lastAt: 0 })
  deps = {
    render: vi.spyOn(exportDeps, 'renderAvatarImage').mockResolvedValue(png),
    size: vi.spyOn(exportDeps, 'readImageSize').mockResolvedValue({ width: 1080, height: 1080 }),
    download: vi.spyOn(exportDeps, 'downloadBlob').mockImplementation(() => {}),
    share: vi.spyOn(exportDeps, 'shareBlob').mockResolvedValue(true),
  }
  vi.unstubAllGlobals()
})

describe('ExportStep', () => {
  it('suggests a file name from the style and frame', async () => {
    await setup()
    expect(screen.getByRole('heading', { name: 'Preview and download' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'File name' })).toHaveValue(
      'avatar-anime-classic-neon',
    )
    expect(screen.getByText('avatar-anime-classic-neon-1080x1080.png')).toBeInTheDocument()
  })

  it('renders, verifies and downloads a 1080×1080 PNG', async () => {
    const { user } = await setup()
    const pending = deferred<Blob>()
    deps.render.mockReturnValueOnce(pending.promise)

    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    const busy = screen.getByRole('button', { name: 'Preparing image…' })
    expect(busy).toBeDisabled()

    await act(async () => pending.resolve(png))

    expect(deps.render).toHaveBeenCalledWith(
      expect.objectContaining({ size: 1080, format: 'png', settings: DEFAULT_FRAME }),
    )
    expect(deps.size).toHaveBeenCalledWith(png)
    expect(deps.download).toHaveBeenCalledWith(png, 'avatar-anime-classic-neon-1080x1080.png')
    expect(
      screen.getByText('Downloaded avatar-anime-classic-neon-1080x1080.png'),
    ).toBeInTheDocument()
    expect(screen.getByText('1080 × 1080 px · 2 KB')).toBeInTheDocument()
  })

  it('exports JPEG with the chosen quality and extension', async () => {
    const { user } = await setup()
    expect(screen.queryByRole('slider', { name: 'JPEG quality' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /jpeg/i }))
    const quality = screen.getByRole('slider', { name: 'JPEG quality' })
    expect(quality).toHaveValue('0.92')
    await user.click(screen.getByRole('button', { name: 'Download JPEG' }))

    expect(deps.render).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'jpeg', quality: 0.92 }),
    )
    expect(deps.download).toHaveBeenCalledWith(png, 'avatar-anime-classic-neon-1080x1080.jpg')
  })

  it('uses a sanitized custom file name', async () => {
    const { user } = await setup()
    const name = screen.getByRole('textbox', { name: 'File name' })
    await user.clear(name)
    await user.type(name, 'My Insta Pic!!')
    expect(screen.getByText('my-insta-pic-1080x1080.png')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(deps.download).toHaveBeenCalledWith(png, 'my-insta-pic-1080x1080.png')
  })

  it('refuses a file with the wrong dimensions', async () => {
    deps.size.mockResolvedValueOnce({ width: 1079, height: 1080 })
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))

    expect(screen.getByRole('alert')).toHaveTextContent('The image came out the wrong size')
    expect(deps.download).not.toHaveBeenCalled()
  })

  it('shows render errors with a working retry', async () => {
    deps.render.mockRejectedValueOnce(new ExportError('encode-failed'))
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t create the image')

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(deps.download).toHaveBeenCalledOnce()
  })

  it('reports blocked downloads', async () => {
    deps.download.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t save the file')
  })

  it('clears the finished state when the settings change', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(screen.getByText(/^Downloaded/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /jpeg/i }))
    expect(screen.queryByText(/^Downloaded/)).not.toBeInTheDocument()
  })

  it('hides Share where the share sheet can’t take files', async () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined })
    await setup()
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
  })

  it('shares through the system share sheet where supported', async () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true })
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Share' }))
    expect(deps.share).toHaveBeenCalledWith(png, 'avatar-anime-classic-neon-1080x1080.png')
    expect(screen.getByText('Shared avatar-anime-classic-neon-1080x1080.png')).toBeInTheDocument()
  })

  it('does nothing visible when the share sheet is dismissed', async () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true })
    deps.share.mockResolvedValueOnce(false)
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.queryByText(/^Shared/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('labels mock styles and omits the label for plain photos', async () => {
    await setup()
    expect(screen.getByText('Mock style, not AI.')).toBeInTheDocument()
  })

  it('omits the mock label for a plain photo', async () => {
    await setup({ source: { url: 'blob:test/photo', label: 'your photo', isMock: false } })
    expect(screen.queryByText('Mock style, not AI.')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'File name' })).toHaveValue('avatar-neon')
  })

  it('switches between profile, square and size previews', async () => {
    const { user } = await setup()
    expect(
      screen.getByRole('img', { name: 'Your avatar with a neon frame in violet' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Square' }))
    expect(screen.getByRole('img', { name: /full square/ })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Sizes' }))
    expect(screen.getByRole('img', { name: /at profile size/ })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show safe area' }))
    expect(screen.getByTestId('export-safe-area')).toBeInTheDocument()
  })

  it('goes back to frames', async () => {
    const { user, onBack } = await setup()
    await user.click(screen.getByRole('button', { name: 'Back to frames' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('has no detectable a11y violations, including after a download', async () => {
    const { user } = await setup()
    expect(await axeViolations()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(await axeViolations()).toEqual([])
  })
})
