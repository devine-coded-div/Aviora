import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BillingApiError, type BillingApi } from '../lib/api'
import { openCheckout } from '../lib/checkout'
import type { AccountView, Pack } from '../types'

export type PurchaseState =
  | { status: 'idle' }
  | { status: 'starting'; pack: Pack }
  | { status: 'checkout'; pack: Pack }
  | { status: 'verifying'; pack: Pack }
  | { status: 'paid'; pack: Pack; credits: number }
  | { status: 'pending'; pack: Pack; orderId: string }
  | { status: 'failed'; pack: Pack; message: string }
  | { status: 'cancelled'; pack: Pack }

/** Injectable for tests (checkout.js can't run in jsdom). */
export const purchaseDeps = { openCheckout, pollIntervalMs: 2500, pollTimeoutMs: 120_000 }

function messageFor(error: unknown): string {
  if (error instanceof BillingApiError) {
    if (error.code === 'payments-disabled') return 'Purchases aren’t available right now.'
    return error.message
  }
  if (error instanceof Error && /load Razorpay/i.test(error.message)) {
    return 'The payment window couldn’t load. Check your connection or disable blockers, then try again.'
  }
  return 'Something went wrong with the payment. You haven’t been charged twice — try again.'
}

/**
 * Order → Razorpay Checkout → server verification. Credits are only ever shown from the
 * server's answer; a payment Razorpay hasn't confirmed yet is "pending" and polled until the
 * server marks the order paid (via the webhook).
 */
export function usePurchase(api: BillingApi, token: string | null) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<PurchaseState>({ status: 'idle' })
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  // Ignore updates after unmount (polling may outlive the modal).
  const set = useCallback((next: PurchaseState) => {
    if (alive.current) setState(next)
  }, [])

  const applyAccount = useCallback(
    (account: AccountView) => {
      if (token) queryClient.setQueryData(['billing', 'account', token], account)
    },
    [queryClient, token],
  )

  const poll = useCallback(
    async (pack: Pack, orderId: string) => {
      if (!token) return
      const deadline = Date.now() + purchaseDeps.pollTimeoutMs
      while (alive.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, purchaseDeps.pollIntervalMs))
        try {
          const order = await api.order(token, orderId)
          if (order.status === 'paid') {
            const account = await api.account(token)
            applyAccount(account)
            set({ status: 'paid', pack, credits: account.credits })
            return
          }
        } catch {
          // keep polling; a transient error isn't a failed payment
        }
      }
    },
    [api, token, applyAccount, set],
  )

  const buy = useCallback(
    async (pack: Pack) => {
      if (!token) return
      set({ status: 'starting', pack })
      try {
        const order = await api.createOrder(token, pack.id)
        set({ status: 'checkout', pack })
        const outcome = await purchaseDeps.openCheckout(order, {
          description: `${pack.credits} credits (${pack.name})`,
        })
        if (outcome.type === 'dismissed') {
          set(
            outcome.lastError
              ? { status: 'failed', pack, message: outcome.lastError }
              : { status: 'cancelled', pack },
          )
          return
        }
        set({ status: 'verifying', pack })
        const result = await api.verify(token, order.id, outcome.payment)
        applyAccount(result.account)
        if (result.outcome === 'paid')
          set({ status: 'paid', pack, credits: result.account.credits })
        else if (result.outcome === 'pending') {
          set({ status: 'pending', pack, orderId: order.id })
          void poll(pack, order.id)
        } else {
          set({
            status: 'failed',
            pack,
            message: result.order.failureReason ?? 'The payment failed.',
          })
        }
      } catch (error) {
        set({ status: 'failed', pack, message: messageFor(error) })
      }
    },
    [api, token, applyAccount, poll, set],
  )

  const reset = useCallback(() => setState({ status: 'idle' }), [])
  return { state, buy, reset }
}
