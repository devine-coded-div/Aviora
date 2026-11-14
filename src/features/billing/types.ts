export interface AccountView {
  credits: number
  free: { limit: number; used: number; remaining: number; resetsAt: string | null }
  creditsPerGeneration: number
  premiumStyles: string[]
}

export interface Pack {
  id: string
  name: string
  credits: number
  /** Smallest currency unit (paise). */
  amount: number
  currency: string
}

export interface PacksView {
  paymentsEnabled: boolean
  testMode: boolean
  keyId: string | null
  currency: string
  packs: Pack[]
}

export type OrderStatus = 'created' | 'paid' | 'failed' | 'expired'

export interface OrderView {
  id: string
  packId: string
  credits: number
  amount: number
  currency: string
  status: OrderStatus
  failureReason: string | null
  razorpayOrderId: string
  keyId: string | null
}

export interface CheckoutSuccess {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyResult {
  outcome: 'paid' | 'pending' | 'failed'
  order: OrderView
  account: AccountView
}
