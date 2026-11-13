import { act, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/lib/constants'
import { axeViolations } from '@/test/axe'
import { domError, fakeStream, mockMediaDevices, removeMediaDevices } from '@/test/media'
import { renderRoute } from '@/test/renderRoute'
import { usePhotoStore } from '../store'

// Canvas and image decoding don't exist in jsdom; stub the browser-only helpers.
const image = vi.hoisted(() => ({
  decodeImage: vi.fn<(url: string) => Promise<HTMLImageElement>>(),
  captureVideoFrame: vi.fn<(video: HTMLVideoElement, mirror: boolean) => Promise<Blob>>(),
  renderCroppedSquare: vi.fn<() => Promise<Blob>>(),
}))
vi.mock('../lib/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/image')>()),
  ...image,
}))

// react-easy-crop needs real layout; stand it in with a stub that reports a crop area.
vi.mock('react-easy-crop', () => ({
  default: function CropperStub(props: {
    onCropComplete: (
      a: unknown,
      px: { x: number; y: number; width: number; height: number },
    ) => void
    cropperProps: Record<string, string>
    zoom: number
  }) {
    const { onCropComplete } = props
    useEffect(() => {
      onCropComplete({}, { x: 100, y: 50, width: 900, height: 900 })
    }, [onCropComplete])
    return <div {...props.cropperProps} data-zoom={props.zoom} />
  },
}))

const network = {
  fetch: vi.fn<typeof fetch>(),
  xhrOpen: vi.fn<() => void>(),
}

beforeEach(() => {
  usePhotoStore.setState({ original: null, crop: null, cropped: null })
  image.decodeImage.mockResolvedValue({
    naturalWidth: 1600,
    naturalHeight: 1200,
  } as HTMLImageElement)
  image.captureVideoFrame.mockResolvedValue(new Blob([new Uint8Array(100)], { type: 'image/jpeg' }))
  image.renderCroppedSquare.mockResolvedValue(
    new Blob([new Uint8Array(100)], { type: 'image/jpeg' }),
  )
  vi.stubGlobal('fetch', network.fetch)
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(network.xhrOpen)
})

afterEach(() => {
  removeMediaDevices()
  vi.unstubAllGlobals()
  // Nothing in the capture flow may touch the network; fail the test that did.
  if (network.fetch.mock.calls.length > 0 || network.xhrOpen.mock.calls.length > 0) {
    throw new Error('The capture flow made a network request')
  }
})

const jpeg = (name = 'me.jpg', type = 'image/jpeg', size = 5000) =>
  new File([new Uint8Array(size)], name, { type })

function fileInput() {
  return screen.getByTestId('photo-file-input') as HTMLInputElement
}

describe('CaptureFlow — camera', () => {
  it('only asks for the camera after the user explicitly turns it on', async () => {
    const gum = mockMediaDevices()
    const { user } = renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    expect(screen.getByText('Allow camera access')).toBeInTheDocument()
    expect(gum).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))
    expect(gum).toHaveBeenCalledOnce()
  })

  it('captures, reviews, retakes and turns the camera off', async () => {
    const streams: ReturnType<typeof fakeStream>[] = []
    mockMediaDevices({
      getUserMedia: () => {
        const s = fakeStream()
        streams.push(s)
        return Promise.resolve(s.stream)
      },
    })
    const { user } = renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))
    const shutter = await screen.findByRole('button', { name: 'Take photo' })
    await waitFor(() => expect(shutter).toBeEnabled())
    expect(screen.getByLabelText('Live camera preview')).toBeInTheDocument()

    await user.click(shutter)

    expect(await screen.findByRole('img', { name: 'Your new selfie' })).toBeInTheDocument()
    expect(streams[0]!.track.stop).toHaveBeenCalled()
    // Front camera shots are mirrored to match the preview.
    expect(image.captureVideoFrame).toHaveBeenCalledWith(expect.any(HTMLVideoElement), true)
    expect(usePhotoStore.getState().original?.source).toBe('camera')

    await user.click(screen.getByRole('button', { name: 'Retake' }))
    expect(usePhotoStore.getState().original).toBeNull()
    expect(screen.getByRole('button', { name: 'Turn on camera' })).toBeInTheDocument()
  })

  it('offers camera switching only when more than one camera exists', async () => {
    const gum = mockMediaDevices({ cameras: 2 })
    const { user } = renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))
    await user.click(await screen.findByRole('button', { name: 'Switch to back camera' }))

    expect(gum).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    )
    expect(
      await screen.findByRole('button', { name: 'Switch to front camera' }),
    ).toBeInTheDocument()
  })

  it('hides camera switching with a single camera', async () => {
    mockMediaDevices({ cameras: 1 })
    const { user } = renderRoute(ROUTES.studio)
    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))
    await screen.findByRole('button', { name: 'Take photo' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Take photo' })).toBeEnabled())
    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument()
  })

  it('explains denied permission and lets the user retry or upload', async () => {
    mockMediaDevices({ getUserMedia: () => Promise.reject(domError('NotAllowedError')) })
    const { user } = renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is blocked')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload a photo' })).toBeInTheDocument()
    expect(await axeViolations()).toEqual([])
  })

  it('explains a missing camera without offering a pointless retry', async () => {
    mockMediaDevices({ getUserMedia: () => Promise.reject(domError('NotFoundError')) })
    const { user } = renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No camera found')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('falls back to the native camera app when getUserMedia is unavailable', async () => {
    removeMediaDevices()
    const { user } = renderRoute(ROUTES.studio)
    const nativeInput = screen.getByTestId('native-camera-input')
    const click = vi.spyOn(nativeInput, 'click').mockImplementation(() => {})

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('can’t use the camera')

    await user.click(screen.getByRole('button', { name: 'Open camera app' }))
    expect(click).toHaveBeenCalledOnce()
    expect(nativeInput).toHaveAttribute('capture', 'user')
  })

  it('stops the camera when the user leaves the studio', async () => {
    const { stream, track } = fakeStream()
    mockMediaDevices({ getUserMedia: () => Promise.resolve(stream) })
    const { user, router } = renderRoute(ROUTES.studio)

    await user.click(screen.getByRole('button', { name: /take a selfie/i }))
    await user.click(screen.getByRole('button', { name: 'Turn on camera' }))
    await screen.findByRole('button', { name: 'Take photo' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Take photo' })).toBeEnabled())

    await act(() => router.navigate(ROUTES.home))
    expect(track.stop).toHaveBeenCalled()
  })
})

describe('CaptureFlow — upload', () => {
  it.each([
    [jpeg('anim.gif', 'image/gif'), 'That file type isn’t supported'],
    [jpeg('big.jpg', 'image/jpeg', 26 * 1024 * 1024), 'That photo is too large'],
  ])('rejects %s with a clear message', async (file, message) => {
    const { user } = renderRoute(ROUTES.studio)
    await user.upload(fileInput(), file)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(usePhotoStore.getState().original).toBeNull()
  })

  it('rejects photos that fail to decode', async () => {
    image.decodeImage.mockRejectedValue(new Error('corrupt'))
    const { user } = renderRoute(ROUTES.studio)
    await user.upload(fileInput(), jpeg())
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t open that photo')
  })

  it('accepts dropped files', async () => {
    renderRoute(ROUTES.studio)
    const zone = screen.getByRole('button', { name: /upload a photo/i }).parentElement!
    const file = jpeg()
    const dataTransfer = { files: [file], types: ['Files'], dropEffect: 'none' }
    await act(async () => {
      zone.dispatchEvent(Object.assign(new Event('drop', { bubbles: true }), { dataTransfer }))
    })
    expect(await screen.findByRole('heading', { name: 'Crop your photo' })).toBeInTheDocument()
  })

  it('goes from upload to crop to result, keeping the original, then starts over', async () => {
    const { user } = renderRoute(ROUTES.studio)
    const file = jpeg()
    await user.upload(fileInput(), file)

    expect(await screen.findByRole('heading', { name: 'Crop your photo' })).toHaveFocus()
    const cropArea = screen.getByRole('group', { name: 'Crop area' })
    expect(cropArea).toHaveAccessibleDescription(/arrow keys/i)

    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveValue('1.2')

    await user.click(screen.getByRole('button', { name: 'Apply crop' }))

    expect(await screen.findByRole('img', { name: 'Your square crop' })).toBeInTheDocument()
    expect(image.renderCroppedSquare).toHaveBeenCalledWith(
      expect.anything(),
      { x: 100, y: 50, width: 900, height: 900 },
      1080,
    )
    const state = usePhotoStore.getState()
    expect(state.original?.blob).toBe(file)
    expect(state.crop).toMatchObject({ zoom: 1.2 })
    expect(state.cropped?.size).toBe(1080)

    // Adjusting restores the previous zoom.
    await user.click(screen.getByRole('button', { name: 'Adjust crop' }))
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveValue('1.2')
    await user.click(screen.getByRole('button', { name: 'Apply crop' }))
    await screen.findByRole('img', { name: 'Your square crop' })

    await user.click(screen.getByRole('button', { name: 'Use a different photo' }))
    expect(screen.getByRole('heading', { name: 'Add your photo' })).toBeInTheDocument()
    expect(usePhotoStore.getState().original).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(state.original!.url)
  })

  it('shows the privacy promise and has no a11y violations on the first step', async () => {
    renderRoute(ROUTES.studio)
    expect(screen.getByText(/nothing is uploaded/i)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Progress' })).toBeInTheDocument()
    expect(await axeViolations()).toEqual([])
  })
})
