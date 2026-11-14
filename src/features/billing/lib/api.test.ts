import { describe, expect, it, vi } from 'vitest'
import { BillingApiError, createBillingApi } from './api'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createBillingApi', () => {
  it('sends the account token and JSON body, and never a price', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(201, { id: 'ord_1' }))
    const api = createBillingApi('https://api.example', fetchImpl)

    await api.createOrder('tok', 'starter')

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe('https://api.example/api/billing/orders')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      'X-Account-Token': 'tok',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init?.body))).toEqual({ packId: 'starter' })
  })

  it('omits the token header for public endpoints', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(200, { packs: [] }))
    await createBillingApi('', fetchImpl).packs()
    expect(fetchImpl.mock.calls[0]![1]?.headers).not.toHaveProperty('X-Account-Token')
  })

  it('maps server errors to BillingApiError with their code', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      json(402, { error: { code: 'payment-required', message: 'Need credits' } }),
    )
    const error = await createBillingApi('', fetchImpl)
      .account('tok')
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(BillingApiError)
    expect(error).toMatchObject({ status: 402, code: 'payment-required', message: 'Need credits' })
  })

  it('reports network failures and non-JSON errors safely', async () => {
    const offline = createBillingApi('', async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(offline.packs()).rejects.toMatchObject({ status: 0, code: 'network' })

    const html = createBillingApi('', async () => new Response('<h1>502</h1>', { status: 502 }))
    await expect(html.packs()).rejects.toMatchObject({ status: 502, code: 'internal' })
  })
})
