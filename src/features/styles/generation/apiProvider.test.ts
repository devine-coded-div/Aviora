import { describe, expect, it, vi } from 'vitest'
import { createApiProvider, fetchProviderInfo, mapServerError } from './apiProvider'
import type { GenerationProgress, ProviderInfo } from './types'

const BASE = 'https://api.example'
const info: ProviderInfo = { id: 'api:mock', name: 'Server', kind: 'mock', runsOnDevice: false }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Scripted fake of the API: each status poll returns the next state. */
function fakeApi(
  states: Array<Record<string, unknown>>,
  opts: { createStatus?: number; createBody?: unknown } = {},
) {
  const calls: { method: string; url: string; auth: string | null; body?: BodyInit | null }[] = []
  const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const auth = new Headers(init?.headers).get('authorization')
    calls.push({ method, url, auth, body: init?.body ?? null })
    if (method === 'POST') {
      return json(
        opts.createBody ?? {
          id: 'job-1',
          status: 'pending',
          token: 'tok-123',
          pollAfterMs: 1,
          error: null,
          result: null,
        },
        opts.createStatus ?? 202,
      )
    }
    if (method === 'DELETE') return new Response(null, { status: 204 })
    if (url.endsWith('/result')) {
      return new Response('png-bytes', { headers: { 'Content-Type': 'image/png' } })
    }
    return json(states.shift() ?? { status: 'failed', error: { code: 'internal' } })
  })
  return { fetchImpl, calls }
}

const image = new Blob(['jpeg'], { type: 'image/jpeg' })

describe('API generation provider', () => {
  it('uploads, polls until completed, downloads the result and deletes the server copy', async () => {
    const api = fakeApi([
      { status: 'processing', pollAfterMs: 1, error: null, result: null },
      {
        status: 'completed',
        pollAfterMs: null,
        error: null,
        result: { url: '/api/generations/job-1/result', mime: 'image/png' },
      },
    ])
    const progress: GenerationProgress[] = []
    const provider = createApiProvider({ baseUrl: BASE, info, fetch: api.fetchImpl })

    const result = await provider.generate({
      image,
      styleId: 'anime-classic',
      onProgress: (p) => progress.push(p),
    })

    expect(await result.image.text()).toBe('png-bytes')
    expect(result.provider).toBe(info)
    const [create, ...rest] = api.calls
    expect(create).toMatchObject({ method: 'POST', url: `${BASE}/api/generations`, auth: null })
    const form = create!.body as FormData
    expect(form.get('styleId')).toBe('anime-classic')
    expect(form.get('image')).toBeInstanceOf(Blob)
    // Every later call is authorized with the job's own token only.
    expect(rest.every((c) => c.auth === 'Bearer tok-123')).toBe(true)
    expect(rest.at(-1)).toMatchObject({ method: 'DELETE', url: `${BASE}/api/generations/job-1` })

    const percents = progress.map((p) => p.percent)
    expect(percents).toEqual([...percents].sort((a, b) => a - b))
    expect(percents.at(-1)).toBe(100)
  })

  it('maps a failed job to a typed error', async () => {
    const api = fakeApi([
      {
        status: 'failed',
        pollAfterMs: null,
        result: null,
        error: { code: 'timeout', message: 'slow', retryable: true },
      },
    ])
    const provider = createApiProvider({ baseUrl: BASE, info, fetch: api.fetchImpl })
    await expect(provider.generate({ image, styleId: 'anime-classic' })).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    })
  })

  it.each([
    [429, { error: { code: 'rate-limited' } }, 'rate-limited'],
    [422, { error: { code: 'image-too-small' } }, 'invalid-input'],
    [503, { error: { code: 'budget-exceeded' } }, 'rate-limited'],
    [500, { error: { code: 'internal' } }, 'provider-error'],
  ])('maps upload rejection %d to %s', async (status, body, kind) => {
    const api = fakeApi([], { createStatus: status, createBody: body })
    const provider = createApiProvider({ baseUrl: BASE, info, fetch: api.fetchImpl })
    await expect(provider.generate({ image, styleId: 'x' })).rejects.toMatchObject({ kind })
  })

  it('reports network failures as retryable network errors', async () => {
    const provider = createApiProvider({
      baseUrl: BASE,
      info,
      fetch: vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch'))),
    })
    await expect(provider.generate({ image, styleId: 'x' })).rejects.toMatchObject({
      kind: 'network',
      retryable: true,
    })
  })

  it('cancels: stops polling and deletes the server job', async () => {
    const api = fakeApi([{ status: 'processing', pollAfterMs: 10_000, error: null, result: null }])
    const controller = new AbortController()
    const provider = createApiProvider({ baseUrl: BASE, info, fetch: api.fetchImpl })
    const pending = provider.generate({ image, styleId: 'x', signal: controller.signal })
    await vi.waitFor(() => expect(api.calls.length).toBeGreaterThanOrEqual(2))

    controller.abort()
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(api.calls.at(-1)).toMatchObject({ method: 'DELETE', auth: 'Bearer tok-123' })
  })

  it('reads provider info and keeps server-side mocks labelled as mocks', async () => {
    const api = vi.fn<typeof fetch>(async () =>
      json({ id: 'mock', name: 'Mock filters (not AI)', kind: 'mock', styles: [] }),
    )
    await expect(fetchProviderInfo(BASE, api)).resolves.toEqual({
      id: 'api:mock',
      name: 'Mock filters (not AI)',
      kind: 'mock',
      runsOnDevice: false,
    })
  })

  it('maps every server error code', () => {
    expect(mapServerError('content-rejected')).toBe('invalid-input')
    expect(mapServerError('unavailable')).toBe('network')
    expect(mapServerError('something-new')).toBe('provider-error')
  })
})
