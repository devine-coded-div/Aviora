import type { AccountView, CheckoutSuccess, OrderView, PacksView, VerifyResult } from '../types'

/** Error from our API, carrying its machine-readable code. */
export class BillingApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'BillingApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Client for the account and billing endpoints. It only ever holds the account token; prices,
 * credits and quotas always come from the server.
 */
export function createBillingApi(baseUrl: string, fetchImpl: typeof fetch = (...a) => fetch(...a)) {
  async function call<T>(
    path: string,
    init: RequestInit & { token?: string | undefined } = {},
  ): Promise<T> {
    const { token, headers, ...rest } = init
    let res: Response
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        ...rest,
        headers: {
          ...(token ? { 'X-Account-Token': token } : {}),
          ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
      })
    } catch {
      throw new BillingApiError(0, 'network', 'Can’t reach the server. Check your connection.')
    }
    const body = (await res.json().catch(() => null)) as {
      error?: { code: string; message: string }
    } | null
    if (!res.ok) {
      throw new BillingApiError(
        res.status,
        body?.error?.code ?? 'internal',
        body?.error?.message ?? 'Something went wrong. Try again.',
      )
    }
    return body as T
  }

  return {
    createAccount: () =>
      call<{ token: string; account: AccountView }>('/api/accounts', { method: 'POST' }),
    account: (token: string) => call<AccountView>('/api/account', { token }),
    packs: () => call<PacksView>('/api/billing/packs'),
    createOrder: (token: string, packId: string) =>
      call<OrderView>('/api/billing/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({ packId }),
      }),
    order: (token: string, id: string) => call<OrderView>(`/api/billing/orders/${id}`, { token }),
    verify: (token: string, id: string, payment: CheckoutSuccess) =>
      call<VerifyResult>(`/api/billing/orders/${id}/verify`, {
        method: 'POST',
        token,
        body: JSON.stringify(payment),
      }),
  }
}

export type BillingApi = ReturnType<typeof createBillingApi>
