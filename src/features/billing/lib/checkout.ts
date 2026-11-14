import type { CheckoutSuccess, OrderView } from '../types'

/**
 * Razorpay Standard Checkout (checkout.js). The browser only receives the public key id and
 * the server-created order id; verification happens on our server.
 */
export const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

interface RazorpayFailure {
  error?: { description?: string; reason?: string }
}

interface RazorpayInstance {
  open(): void
  on(event: 'payment.failed', cb: (response: RazorpayFailure) => void): void
}

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}

let loading: Promise<RazorpayCtor> | null = null

/** Load checkout.js once. Rejects if it can't load (offline, blocked by an extension…). */
export function loadCheckout(doc: Document = document): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const script = doc.createElement('script')
    script.src = CHECKOUT_SRC
    script.async = true
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay missing'))
    script.onerror = () => {
      script.remove()
      loading = null
      reject(new Error('Could not load Razorpay checkout'))
    }
    doc.head.append(script)
  })
  return loading
}

/** For tests. */
export function resetCheckoutLoader() {
  loading = null
}

export type CheckoutOutcome =
  | { type: 'success'; payment: CheckoutSuccess }
  /** Closed without paying; `lastError` is set if an attempt failed first. */
  | { type: 'dismissed'; lastError: string | null }

export async function openCheckout(
  order: OrderView,
  opts: { description: string },
): Promise<CheckoutOutcome> {
  const Razorpay = await loadCheckout()
  if (!order.keyId) throw new Error('Payments are not configured')
  return new Promise<CheckoutOutcome>((resolve) => {
    let lastError: string | null = null
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'AI Avatar Studio',
      description: opts.description,
      theme: { color: '#7c3aed' },
      handler: (response: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) =>
        resolve({
          type: 'success',
          payment: {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          },
        }),
      modal: { ondismiss: () => resolve({ type: 'dismissed', lastError }) },
    })
    // A failed attempt keeps checkout open so the user can try another method.
    rzp.on('payment.failed', (response) => {
      lastError = response.error?.description ?? 'The payment failed.'
    })
    rzp.open()
  })
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}
