import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { orderView } from '../test/fakeApi'
import {
  CHECKOUT_SRC,
  formatPrice,
  loadCheckout,
  openCheckout,
  resetCheckoutLoader,
} from './checkout'

type Options = Record<string, unknown> & {
  handler: (r: Record<string, string>) => void
  modal: { ondismiss: () => void }
}

let instance: { options: Options; failed?: (r: unknown) => void } | null = null

function installFakeRazorpay() {
  window.Razorpay = class {
    constructor(options: Record<string, unknown>) {
      instance = { options: options as Options }
    }
    open() {}
    on(_event: string, cb: (r: unknown) => void) {
      instance!.failed = cb
    }
  } as unknown as NonNullable<typeof window.Razorpay>
}

beforeEach(() => {
  resetCheckoutLoader()
  delete window.Razorpay
  instance = null
  document.head.querySelectorAll('script').forEach((s) => s.remove())
})
afterEach(() => {
  delete window.Razorpay
})

describe('loadCheckout', () => {
  it('injects checkout.js once and resolves when it loads', async () => {
    const first = loadCheckout()
    const second = loadCheckout()
    const scripts = document.head.querySelectorAll(`script[src="${CHECKOUT_SRC}"]`)
    expect(scripts).toHaveLength(1)

    installFakeRazorpay()
    scripts[0]!.dispatchEvent(new Event('load'))
    await expect(first).resolves.toBe(window.Razorpay)
    await expect(second).resolves.toBe(window.Razorpay)
  })

  it('rejects when blocked, and can be retried', async () => {
    const attempt = loadCheckout()
    document.head.querySelector('script')!.dispatchEvent(new Event('error'))
    await expect(attempt).rejects.toThrow(/load Razorpay/)
    expect(document.head.querySelector('script')).toBeNull()

    void loadCheckout()
    expect(document.head.querySelectorAll('script')).toHaveLength(1)
  })
})

describe('openCheckout', () => {
  beforeEach(installFakeRazorpay)

  it('opens checkout with the server order and only the public key', async () => {
    const outcome = openCheckout(orderView(), { description: '10 credits' })
    await vi.waitFor(() => expect(instance).not.toBeNull())
    expect(instance!.options).toMatchObject({
      key: 'rzp_test_key',
      order_id: 'order_rzp_1',
      amount: 9900,
      currency: 'INR',
    })
    instance!.options.handler({
      razorpay_order_id: 'order_rzp_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig',
    })
    await expect(outcome).resolves.toEqual({
      type: 'success',
      payment: {
        razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig',
      },
    })
  })

  it('reports a dismissal, with the last failure if an attempt failed', async () => {
    const outcome = openCheckout(orderView(), { description: 'x' })
    await vi.waitFor(() => expect(instance).not.toBeNull())
    instance!.failed!({ error: { description: 'Card declined' } })
    instance!.options.modal.ondismiss()
    await expect(outcome).resolves.toEqual({ type: 'dismissed', lastError: 'Card declined' })
  })

  it('refuses to open without a key id', async () => {
    await expect(openCheckout(orderView({ keyId: null }), { description: 'x' })).rejects.toThrow(
      /not configured/,
    )
  })
})

it('formats prices from paise', () => {
  expect(formatPrice(9900, 'INR')).toBe('₹99')
  expect(formatPrice(4950, 'INR')).toBe('₹49.50')
})
