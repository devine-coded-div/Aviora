import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axeViolations } from '@/test/axe'
import { DEFAULT_FRAME, getPreset } from '../presets'
import type { FrameSettings } from '../types'
import { useFrameStore } from '../store'
import { FrameStep } from './FrameStep'

// The canvas pipeline is covered by unit tests; here we capture what the editor asks it to draw.
const drawAvatar = vi.hoisted(() => vi.fn<(ctx: unknown, size: number, s: FrameSettings) => void>())
vi.mock('../render/drawAvatar', () => ({ drawAvatar }))
vi.mock('../hooks/useSourceImage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useSourceImage')>()),
  loadSourceImage: () => Promise.resolve({ image: {}, width: 1080, height: 1080 }),
}))

const source = { url: 'blob:test/styled', label: 'Bold Cartoon style', isMock: true }

function setup(props: Partial<Parameters<typeof FrameStep>[0]> = {}) {
  const user = userEvent.setup()
  const onBack = vi.fn<() => void>()
  render(
    <main>
      <FrameStep
        source={source}
        onBack={onBack}
        onContinue={vi.fn<() => void>()}
        focusOnMount
        {...props}
      />
    </main>,
  )
  return { user, onBack }
}

const preview = () => screen.getByRole('img', { name: /your avatar with/i })
const lastDrawn = () => drawAvatar.mock.calls.at(-1)?.[2]

beforeEach(() => {
  useFrameStore.setState({ present: DEFAULT_FRAME, past: [], future: [], lastKey: null, lastAt: 0 })
  // jsdom has no canvas; give it a context and a size so the preview renders.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {} as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 400,
    height: 400,
  } as DOMRect)
})

describe('FrameStep', () => {
  it('renders the current frame and offers every preset', async () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Frame your avatar' })).toHaveFocus()
    const presets = within(screen.getByRole('group', { name: 'Frame' })).getAllByRole('radio')
    expect(presets.map((r) => r.getAttribute('value'))).toEqual([
      'none',
      'flame',
      'dark',
      'solid',
      'gradient',
      'neon',
      'minimal',
    ])
    expect(screen.getByRole('radio', { name: 'Neon' })).toBeChecked()
    expect(preview()).toHaveAccessibleName('Your avatar with a neon frame in violet')
    await waitFor(() => expect(lastDrawn()).toEqual(DEFAULT_FRAME))
  })

  it('builds the controls from the selected preset', async () => {
    const { user } = setup()
    const settings = screen.getByRole('region', { name: 'Frame settings' })
    expect(within(settings).getByRole('slider', { name: 'Glow' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Flame' }))

    expect(within(settings).getByRole('group', { name: 'Flame core' })).toBeInTheDocument()
    expect(within(settings).getByRole('group', { name: 'Flame tips' })).toBeInTheDocument()
    expect(within(settings).getByRole('slider', { name: 'Flame height' })).toBeInTheDocument()
    expect(within(settings).queryByRole('slider', { name: 'Glow' })).not.toBeInTheDocument()
    await waitFor(() => expect(lastDrawn()).toEqual(getPreset('flame').defaults))
  })

  it('updates the render when a slider moves, and shows thickness in export pixels', async () => {
    setup()
    const thickness = screen.getByRole('slider', { name: 'Thickness' })
    fireEvent.change(thickness, { target: { value: '0.03' } })

    expect(useFrameStore.getState().present.thickness).toBe(0.03)
    expect(thickness).toHaveAttribute('aria-valuetext', '32 px at 1080 pixels')
    await waitFor(() => expect(lastDrawn()?.thickness).toBe(0.03))
  })

  it('changes colour from a swatch or the custom picker', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('radio', { name: 'Pink' }))
    expect(useFrameStore.getState().present.color).toBe('#f472b6')
    expect(preview()).toHaveAccessibleName('Your avatar with a neon frame in pink')

    fireEvent.change(screen.getByLabelText('Custom neon colour'), { target: { value: '#123456' } })
    expect(useFrameStore.getState().present.color).toBe('#123456')
    expect(preview()).toHaveAccessibleName(/custom colour/)
  })

  it('undoes, redoes and resets', async () => {
    const { user } = setup()
    const undo = screen.getByRole('button', { name: 'Undo' })
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'Pink' }))
    expect(undo).toBeEnabled()
    await user.click(undo)
    expect(useFrameStore.getState().present.color).toBe(DEFAULT_FRAME.color)
    expect(redo).toBeEnabled()
    await user.click(redo)
    expect(useFrameStore.getState().present.color).toBe('#f472b6')

    await user.click(screen.getByRole('button', { name: 'Reset frame' }))
    expect(useFrameStore.getState().present).toEqual(DEFAULT_FRAME)
    expect(undo).toBeEnabled()
  })

  it('supports Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('radio', { name: 'Pink' }))
    await user.keyboard('{Control>}z{/Control}')
    expect(useFrameStore.getState().present.color).toBe(DEFAULT_FRAME.color)
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(useFrameStore.getState().present.color).toBe('#f472b6')
    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}y{/Control}')
    expect(useFrameStore.getState().present.color).toBe('#f472b6')
  })

  it('shows a safe-area guide over the preview on request', async () => {
    const { user } = setup()
    expect(screen.queryByTestId('safe-area-guide')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show safe area' }))
    const guide = screen.getByTestId('safe-area-guide')
    // Same box as the canvas: both fill the same square container.
    expect(guide.parentElement).toBe(preview().parentElement)
    expect(guide).toHaveClass('absolute', 'inset-0', 'rounded-full')
  })

  it('switches between circle and square previews', async () => {
    const { user } = setup()
    const container = preview().parentElement!
    expect(container).toHaveClass('rounded-full')
    await user.click(screen.getByRole('radio', { name: 'Square' }))
    expect(container).not.toHaveClass('rounded-full')
  })

  it('labels mock results and says what is being framed', () => {
    setup()
    expect(screen.getByText(/framing: bold cartoon style/i)).toBeInTheDocument()
    expect(screen.getByText('Mock preview · not AI')).toBeInTheDocument()
  })

  it('omits the mock label for a plain photo', () => {
    setup({ source: { url: 'blob:test/photo', label: 'your photo (no style)', isMock: false } })
    expect(screen.queryByText('Mock preview · not AI')).not.toBeInTheDocument()
  })

  it('renders at the element size × devicePixelRatio for sharp output', async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    setup()
    await waitFor(() => expect(drawAvatar.mock.calls.some((c) => c[1] === 800)).toBe(true))
    expect((preview() as HTMLCanvasElement).width).toBe(800)
    vi.unstubAllGlobals()
  })

  it('goes back to styles', async () => {
    const { user, onBack } = setup()
    await user.click(screen.getByRole('button', { name: 'Back to styles' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('has no detectable a11y violations', async () => {
    setup()
    await act(async () => {})
    expect(await axeViolations()).toEqual([])
  })
})
