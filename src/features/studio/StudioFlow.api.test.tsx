import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePhotoStore } from '@/features/capture'
import { useStyleStore } from '@/features/styles'
import { accountView, PACKS, TOKEN } from '@/features/billing/test/fakeApi'
import { StudioFlow } from './StudioFlow'

const API = 'https://api.test'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** A tiny fake of our server's HTTP surface. */
function fakeServer() {
  const state = { providerUp: false, generationCode: 'payment-required' }
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    if (url.pathname === '/api/provider') {
      return state.providerUp
        ? json(200, { id: 'mock', name: 'Mock', kind: 'mock' })
        : json(503, { error: { code: 'unavailable', message: 'down' } })
    }
    if (url.pathname === '/api/accounts' && method === 'POST') {
      return json(201, { token: TOKEN, account: accountView({ credits: 0 }) })
    }
    if (url.pathname === '/api/account') return json(200, accountView({ credits: 0 }))
    if (url.pathname === '/api/billing/packs') return json(200, PACKS)
    if (url.pathname === '/api/generations' && method === 'POST') {
      return json(402, { error: { code: state.generationCode, message: 'Needs credits' } })
    }
    return json(404, { error: { code: 'not-found', message: 'nope' } })
  })
  return { state, fetchMock }
}

beforeEach(() => {
  localStorage.clear()
  usePhotoStore.setState({
    cropped: { blob: new Blob(['c']), url: 'blob:test/cropped', size: 1080, lowResolution: false },
  })
  useStyleStore.getState().reset()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StudioFlow (API mode)', () => {
  it('recovers from an unreachable server, then gates premium styles on credits', async () => {
    const server = fakeServer()
    vi.stubGlobal('fetch', server.fetchMock)
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <StudioFlow apiBaseUrl={API} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /choose a style/i }))
    expect(await screen.findByText(/can’t reach the studio server/i)).toBeInTheDocument()

    server.state.providerUp = true
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Choose a style' })).toBeInTheDocument()
    expect(screen.getByText(/premium styles use 1 credit/i)).toBeInTheDocument()
    expect(await screen.findByText(/of 3 free left today/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /comic pop/i }))
    await user.click(await screen.findByRole('button', { name: 'Generate Comic Pop preview' }))

    // The server refuses (402); the account token went with the request.
    const create = server.fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/generations'))
    expect(new Headers(create![1]?.headers).get('X-Account-Token')).toBe(TOKEN)
    // Both the credits bar and the error offer "Get credits"; use the error's.
    expect(await screen.findByText('Credits needed')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Get credits' })
    expect(buttons).toHaveLength(2)
    await user.click(buttons[1]!)
    const dialog = await screen.findByRole('dialog', { name: 'Get credits' })
    expect(
      within(dialog).getByText(/premium styles use 1 credit per generation/i),
    ).toBeInTheDocument()
  })
})
