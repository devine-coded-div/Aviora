import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axeViolations } from '@/test/axe'
import { controlledProvider } from '@/test/controlledProvider'
import { AVATAR_STYLES, DEFAULT_STYLE_ID } from '../catalog'
import { GenerationProviderScope } from '../generation/ProviderContext'
import type { AvatarGenerationProvider } from '../generation/types'
import { useStyleStore } from '../store'
import { StyleStep } from './StyleStep'

const source = {
  blob: new Blob([new Uint8Array(10)], { type: 'image/jpeg' }),
  url: 'blob:test/source',
}
const fetchSpy = vi.fn<typeof fetch>()

function setup(provider: AvatarGenerationProvider, onBack = vi.fn<() => void>()) {
  const user = userEvent.setup()
  render(
    // Wrapped in <main> like the real page, so axe's landmark rule applies realistically.
    <main>
      <GenerationProviderScope provider={provider}>
        <StyleStep source={source} onBack={onBack} focusOnMount />
      </GenerationProviderScope>
    </main>,
  )
  return { user, onBack }
}

beforeEach(() => {
  useStyleStore.setState({ selectedId: DEFAULT_STYLE_ID, sourceUrl: null, results: {} })
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (fetchSpy.mock.calls.length > 0) throw new Error('Style step made a network request')
})

describe('StyleStep — catalog', () => {
  it('lists every style as one radio group, with the default selected', () => {
    setup(controlledProvider().provider)
    const group = screen.getByRole('group', { name: 'Avatar style' })
    const radios = within(group).getAllByRole('radio')

    expect(radios).toHaveLength(AVATAR_STYLES.length)
    expect(within(group).getByRole('radio', { name: /bold cartoon/i })).toBeChecked()
    expect(screen.getByRole('heading', { name: 'Choose a style' })).toHaveFocus()
  })

  it('filters by category', async () => {
    const { user } = setup(controlledProvider().provider)
    const filter = screen.getByRole('button', { name: 'Pixel Art' })

    await user.click(filter)

    expect(filter).toHaveAttribute('aria-pressed', 'true')
    const radios = within(screen.getByRole('group', { name: 'Avatar style' })).getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['pixel-8bit', 'pixel-16bit'])
  })

  it('selects with the keyboard and updates the preview', async () => {
    const { user } = setup(controlledProvider().provider)
    await user.click(screen.getByRole('radio', { name: /bold cartoon/i }))
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: /comic pop/i })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Generate Comic Pop preview' })).toBeInTheDocument()
    expect(useStyleStore.getState().selectedId).toBe('cartoon-comic')
  })

  it('marks premium styles', () => {
    setup(controlledProvider().provider)
    const premiumCount = AVATAR_STYLES.filter((s) => s.premium).length
    expect(screen.getAllByText('Premium')).toHaveLength(premiumCount)
  })
})

describe('StyleStep — generation', () => {
  it('discloses that the mock is not AI', () => {
    setup(controlledProvider({ kind: 'mock' }).provider)
    expect(screen.getByRole('note')).toHaveTextContent(/preview mode — not ai/i)
  })

  it('does not show the mock disclosure for a real provider', () => {
    setup(controlledProvider({ kind: 'ai', runsOnDevice: false }).provider)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('shows progress, then a result clearly labelled as a mock', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)

    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    expect(fake.generate).toHaveBeenCalledWith(
      expect.objectContaining({ image: source.blob, styleId: DEFAULT_STYLE_ID }),
    )

    const bar = screen.getByRole('progressbar', { name: 'Generating Bold Cartoon preview' })
    act(() => fake.progress(50))
    expect(bar).toHaveAttribute('value', '50')
    expect(screen.getByText('Applying preview filter on your device…')).toBeInTheDocument()

    await act(async () => fake.succeed())

    expect(
      screen.getByRole('img', { name: /bold cartoon style \(mock preview\)/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Mock preview · not AI')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Bold Cartoon preview ready.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /bold cartoon.*preview ready/i })).toBeInTheDocument()
  })

  it('compares with the original', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    await act(async () => fake.succeed())

    const styled = screen.getByRole('img', { name: /bold cartoon style/i }).getAttribute('src')

    await user.click(screen.getByRole('button', { name: 'Show original' }))
    expect(screen.getByRole('img', { name: /before styling/i })).toHaveAttribute('src', source.url)
    expect(screen.getByText('Original')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show styled' }))
    expect(screen.getByRole('img', { name: /bold cartoon style/i })).toHaveAttribute('src', styled)
    expect(screen.getByRole('button', { name: 'Show original' })).toBeInTheDocument()
  })

  it('cancels a running generation', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(fake.latest().request.signal?.aborted).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows retryable errors with Try again, and suggests alternatives after repeated failures', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))

    await act(async () => fake.fail('network'))
    expect(screen.getByRole('alert')).toHaveTextContent('Connection problem')
    expect(screen.queryByText(/still not working/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await act(async () => fake.fail('network'))
    expect(screen.queryByText(/still not working/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await act(async () => fake.fail('network'))
    expect(screen.getByRole('alert')).toHaveTextContent('Connection problem')

    expect(fake.generate).toHaveBeenCalledTimes(3)
    expect(screen.getByText(/still not working/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await act(async () => fake.succeed())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not offer retry for non-retryable errors', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    await act(async () => fake.fail('invalid-input'))

    expect(screen.getByRole('alert')).toHaveTextContent('This photo can’t be styled')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('reuses cached results when switching back to a style', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    await act(async () => fake.succeed())

    await user.click(screen.getByRole('radio', { name: /anime classic/i }))
    expect(
      screen.getByRole('button', { name: 'Generate Anime Classic preview' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /bold cartoon/i }))

    expect(screen.getByRole('img', { name: /bold cartoon style/i })).toBeInTheDocument()
    expect(fake.generate).toHaveBeenCalledOnce()
  })

  it('only shows progress on the style being generated', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    await user.click(screen.getByRole('radio', { name: /anime classic/i }))

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /bold cartoon/i }))
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('cancels in-flight work when the step unmounts', async () => {
    const fake = controlledProvider()
    const user = userEvent.setup()
    const view = render(
      <GenerationProviderScope provider={fake.provider}>
        <StyleStep source={source} onBack={vi.fn<() => void>()} focusOnMount={false} />
      </GenerationProviderScope>,
    )
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    view.unmount()
    expect(fake.latest().request.signal?.aborted).toBe(true)
  })

  it('goes back to the photo step', async () => {
    const { user, onBack } = setup(controlledProvider().provider)
    await user.click(screen.getByRole('button', { name: 'Change photo' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('has no detectable a11y violations, before and after generating', async () => {
    const fake = controlledProvider()
    const { user } = setup(fake.provider)
    expect(await axeViolations()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Generate Bold Cartoon preview' }))
    expect(await axeViolations()).toEqual([])
    await act(async () => fake.succeed())
    expect(await axeViolations()).toEqual([])
  })
})
