import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { purchaseDeps } from '../hooks/usePurchase'
import type { CheckoutOutcome } from '../lib/checkout'
import { accountView, fakeBillingApi, orderView, PACKS, TOKEN } from '../test/fakeApi'
import { BillingProvider } from './BillingProvider'
import { CreditsBar } from './CreditsBar'

const STORAGE_KEY = 'ai-avatar-studio.account'
const original = { ...purchaseDeps }

function setup(api = fakeBillingApi().api) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <BillingProvider baseUrl="" api={api}>
        <CreditsBar />
      </BillingProvider>
    </QueryClientProvider>,
  )
  return { user, api }
}

async function openModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Get credits' }))
  const dialog = screen.getByRole('dialog', { name: 'Get credits' })
  await within(dialog).findByRole('list', { name: 'Credit packs' })
  return dialog
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  Object.assign(purchaseDeps, original)
})

describe('account session', () => {
  it('creates an anonymous account, stores its token and shows server balances', async () => {
    const { api } = setup()
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.getByText(/of 3 free left today/)).toBeInTheDocument()
    expect(api.createAccount).toHaveBeenCalledOnce()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(TOKEN)
  })

  it('reuses a stored token the server still recognises', async () => {
    localStorage.setItem(STORAGE_KEY, TOKEN)
    const fake = fakeBillingApi(accountView({ credits: 7 }))
    setup(fake.api)
    expect(await screen.findByText('7')).toBeInTheDocument()
    expect(fake.api.createAccount).not.toHaveBeenCalled()
  })

  it('replaces a stored token the server no longer knows', async () => {
    localStorage.setItem(STORAGE_KEY, 'b'.repeat(43))
    const { api } = setup()
    await screen.findByText(/free left today/)
    expect(api.createAccount).toHaveBeenCalledOnce()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(TOKEN)
  })

  it('shows a retryable error when the server is unreachable', async () => {
    const fake = fakeBillingApi()
    fake.api.createAccount.mockRejectedValue(new Error('offline'))
    const { user } = setup(fake.api)
    // The session query retries once by itself before giving up.
    const retry = await screen.findByRole('button', { name: 'Retry' }, { timeout: 4000 })
    expect(fake.api.createAccount).toHaveBeenCalledTimes(2)
    await user.click(retry)
    await waitFor(() => expect(fake.api.createAccount).toHaveBeenCalledTimes(3))
    expect(screen.getByRole('button', { name: 'Get credits' })).toBeDisabled()
  })
})

describe('upgrade modal', () => {
  it('lists server packs with prices and flags test mode', async () => {
    const { user } = setup()
    const dialog = await openModal(user)
    expect(within(dialog).getByRole('note')).toHaveTextContent(/test mode/i)
    expect(within(dialog).getByRole('button', { name: 'Buy 10 credits for ₹99' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Buy 30 credits for ₹249' })).toBeEnabled()
  })

  it('completes a purchase and shows the server-confirmed balance', async () => {
    const outcome: CheckoutOutcome = {
      type: 'success',
      payment: {
        razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 's',
      },
    }
    purchaseDeps.openCheckout = vi.fn<typeof purchaseDeps.openCheckout>(async () => outcome)
    const { user, api } = setup()
    const dialog = await openModal(user)

    await user.click(within(dialog).getByRole('button', { name: 'Buy 10 credits for ₹99' }))

    expect(
      await within(dialog).findByText(/payment confirmed — 10 credits added/i),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('You now have 10 credits.')).toBeInTheDocument()
    expect(api.createOrder).toHaveBeenCalledWith(TOKEN, 'starter')
    expect(api.verify).toHaveBeenCalledWith(TOKEN, 'ord_1', outcome.payment)

    await user.click(within(dialog).getByRole('button', { name: 'Back to my avatar' }))
    expect(dialog).not.toHaveAttribute('open')
    expect(await screen.findByText('10')).toBeInTheDocument()
  })

  it('treats a closed checkout as cancelled, with no charge', async () => {
    purchaseDeps.openCheckout = vi.fn<typeof purchaseDeps.openCheckout>(
      async () => ({ type: 'dismissed', lastError: null }) as const,
    )
    const { user, api } = setup()
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('button', { name: 'Buy 10 credits for ₹99' }))
    expect(await within(dialog).findByText(/payment cancelled/i)).toBeInTheDocument()
    expect(api.verify).not.toHaveBeenCalled()
  })

  it('shows a failed attempt and lets the user retry', async () => {
    purchaseDeps.openCheckout = vi
      .fn<typeof purchaseDeps.openCheckout>()
      .mockResolvedValueOnce({ type: 'dismissed', lastError: 'Card declined by bank' })
      .mockResolvedValueOnce({ type: 'dismissed', lastError: null })
    const { user, api } = setup()
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('button', { name: 'Buy 10 credits for ₹99' }))
    expect(await within(dialog).findByText('Card declined by bank')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }))
    expect(await within(dialog).findByText(/payment cancelled/i)).toBeInTheDocument()
    expect(api.createOrder).toHaveBeenCalledTimes(2)
  })

  it('reports a server-rejected payment as failed', async () => {
    purchaseDeps.openCheckout = vi.fn<typeof purchaseDeps.openCheckout>(async () => ({
      type: 'success' as const,
      payment: { razorpayOrderId: 'o', razorpayPaymentId: 'p', razorpaySignature: 'forged' },
    }))
    const fake = fakeBillingApi()
    fake.api.verify.mockResolvedValue({
      outcome: 'failed',
      order: orderView({ status: 'failed', failureReason: 'Payment amount mismatch' }),
      account: accountView(),
    })
    const { user } = setup(fake.api)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('button', { name: 'Buy 10 credits for ₹99' }))
    expect(await within(dialog).findByText('Payment amount mismatch')).toBeInTheDocument()
  })

  it('polls a pending payment until the server marks the order paid', async () => {
    Object.assign(purchaseDeps, {
      pollIntervalMs: 5,
      openCheckout: vi.fn<typeof purchaseDeps.openCheckout>(async () => ({
        type: 'success' as const,
        payment: { razorpayOrderId: 'o', razorpayPaymentId: 'p', razorpaySignature: 's' },
      })),
    })
    const fake = fakeBillingApi()
    fake.api.verify.mockResolvedValue({
      outcome: 'pending',
      order: orderView(),
      account: accountView(),
    })
    fake.api.order
      .mockResolvedValueOnce(orderView())
      .mockResolvedValue(orderView({ status: 'paid' }))
    const { user } = setup(fake.api)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('button', { name: 'Buy 10 credits for ₹99' }))
    expect(await within(dialog).findByText('Payment processing')).toBeInTheDocument()

    fake.setAccount(accountView({ credits: 10 }))
    expect(await within(dialog).findByText(/payment confirmed/i)).toBeInTheDocument()
    expect(fake.api.order).toHaveBeenCalledTimes(2)
  })

  it('explains when purchases are disabled on the server', async () => {
    const fake = fakeBillingApi()
    fake.api.packs.mockResolvedValue({ ...PACKS, paymentsEnabled: false, keyId: null })
    const { user } = setup(fake.api)
    await user.click(await screen.findByRole('button', { name: 'Get credits' }))
    const dialog = screen.getByRole('dialog', { name: 'Get credits' })
    expect(await within(dialog).findByText(/purchases aren’t available yet/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('list', { name: 'Credit packs' })).not.toBeInTheDocument()
  })

  it('restores an account from a valid code and rejects bad ones', async () => {
    const fake = fakeBillingApi()
    const { user } = setup(fake.api)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByText('Using another device?'))
    const input = within(dialog).getByLabelText('Restore credits from another device')

    await user.type(input, 'short')
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }))
    expect(within(dialog).getByText(/that code didn’t work/i)).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'c'.repeat(43))
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }))
    expect(await within(dialog).findByText(/that code didn’t work/i)).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, TOKEN)
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }))
    expect(await within(dialog).findByText(/restored/i)).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe(TOKEN))
  })
})
