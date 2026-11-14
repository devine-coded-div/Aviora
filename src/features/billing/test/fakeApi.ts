import { vi } from 'vitest'
import { BillingApiError, type BillingApi } from '../lib/api'
import type { AccountView, OrderView, PacksView, VerifyResult } from '../types'

export const TOKEN = 'a'.repeat(43)

export function accountView(overrides: Partial<AccountView> = {}): AccountView {
  return {
    credits: 0,
    free: { limit: 3, used: 1, remaining: 2, resetsAt: null },
    creditsPerGeneration: 1,
    premiumStyles: ['realistic-studio'],
    ...overrides,
  }
}

export const PACKS: PacksView = {
  paymentsEnabled: true,
  testMode: true,
  keyId: 'rzp_test_key',
  currency: 'INR',
  packs: [
    { id: 'starter', name: 'Starter', credits: 10, amount: 9900, currency: 'INR' },
    { id: 'creator', name: 'Creator', credits: 30, amount: 24900, currency: 'INR' },
  ],
}

export function orderView(overrides: Partial<OrderView> = {}): OrderView {
  return {
    id: 'ord_1',
    packId: 'starter',
    credits: 10,
    amount: 9900,
    currency: 'INR',
    status: 'created',
    failureReason: null,
    razorpayOrderId: 'order_rzp_1',
    keyId: 'rzp_test_key',
    ...overrides,
  }
}

/** In-memory stand-in for the billing API. Every method is a spy the test can override. */
export function fakeBillingApi(initial: AccountView = accountView()) {
  let account = initial
  const api = {
    createAccount: vi.fn<BillingApi['createAccount']>(async () => ({ token: TOKEN, account })),
    account: vi.fn<BillingApi['account']>(async (token) => {
      if (token !== TOKEN) throw new BillingApiError(401, 'unauthorized', 'Unknown account')
      return account
    }),
    packs: vi.fn<BillingApi['packs']>(async () => PACKS),
    createOrder: vi.fn<BillingApi['createOrder']>(async () => orderView()),
    order: vi.fn<BillingApi['order']>(async () => orderView()),
    verify: vi.fn<BillingApi['verify']>(async (): Promise<VerifyResult> => {
      account = { ...account, credits: account.credits + 10 }
      return { outcome: 'paid', order: orderView({ status: 'paid' }), account }
    }),
  } satisfies BillingApi
  return {
    api,
    setAccount: (next: AccountView) => {
      account = next
    },
  }
}
