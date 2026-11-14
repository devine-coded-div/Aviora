import { createContext, useContext } from 'react'
import type { BillingApi } from './lib/api'
import type { AccountView } from './types'

export type UpgradeReason = 'premium' | 'quota' | null

export interface BillingContextValue {
  api: BillingApi
  /** Anonymous account token, once ready. */
  token: string | null
  account: AccountView | undefined
  status: 'loading' | 'ready' | 'error'
  refresh: () => void
  openUpgrade: (reason?: UpgradeReason) => void
  /** Switch to an account from another device using its restore code. */
  restore: (code: string) => Promise<void>
}

export const BillingContext = createContext<BillingContextValue | null>(null)

/** Billing is only available when the app talks to the API; returns null otherwise. */
export function useBilling(): BillingContextValue | null {
  return useContext(BillingContext)
}
