import { useQuery } from '@tanstack/react-query'
import { Check, CircleAlert, Copy, Crown, FlaskConical, Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Badge, Button, Notice } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { UpgradeReason } from '../billingContext'
import { usePurchase, type PurchaseState } from '../hooks/usePurchase'
import type { BillingApi } from '../lib/api'
import { formatPrice } from '../lib/checkout'
import { isPlausibleToken } from '../lib/session'
import type { AccountView, Pack } from '../types'

export interface UpgradeModalProps {
  open: boolean
  reason: UpgradeReason
  onClose: () => void
  api: BillingApi
  token: string | null
  account: AccountView | undefined
  onRestore: (code: string) => Promise<void>
}

const REASON_TEXT: Record<NonNullable<UpgradeReason>, string> = {
  premium: 'Premium styles use 1 credit per generation.',
  quota: 'You’ve used today’s free generations. Credits let you keep going.',
}

/**
 * Credit pack picker and purchase flow. Prices, balances and outcomes all come from the server;
 * the modal never decides what the user is entitled to.
 */
export function UpgradeModal({
  open,
  reason,
  onClose,
  api,
  token,
  account,
  onRestore,
}: UpgradeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const packs = useQuery({
    queryKey: ['billing', 'packs'],
    queryFn: api.packs,
    enabled: open,
    staleTime: 60_000,
  })
  const { state, buy, reset } = usePurchase(api, token)
  const busy =
    state.status === 'starting' || state.status === 'checkout' || state.status === 'verifying'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      reset()
      dialog.showModal()
    } else if (!open && dialog.open) dialog.close()
  }, [open, reset])

  const close = () => {
    if (!busy) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        // Don't let Escape close it mid-payment.
        if (busy) e.preventDefault()
      }}
      className="m-auto w-[min(92vw,34rem)] rounded-(--radius-card) border border-border bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] flex-col overflow-y-auto">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="flex items-center gap-2 text-xl font-semibold">
              <Crown className="size-5 text-amber-200" aria-hidden="true" />
              Get credits
            </h2>
            <p className="text-sm text-fg-muted">
              {reason
                ? REASON_TEXT[reason]
                : 'Credits unlock Premium styles and extra generations.'}
            </p>
          </div>
          <Button
            variant="ghost"
            className="size-10 shrink-0 px-0"
            aria-label="Close"
            onClick={close}
            disabled={busy}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {account && (
            <p className="rounded-xl bg-surface-raised px-4 py-3 text-sm">
              <span className="font-medium">{account.credits} credits</span>
              <span className="text-fg-muted">
                {' '}
                · {account.free.remaining} of {account.free.limit} free generations left today
              </span>
            </p>
          )}

          {packs.data?.testMode && (
            <p
              className="flex gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm"
              role="note"
            >
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-200" aria-hidden="true" />
              <span>
                <span className="font-medium">Test mode.</span>{' '}
                <span className="text-fg-muted">
                  Payments use Razorpay’s sandbox — use a test card or UPI ID. No real money is
                  charged.
                </span>
              </span>
            </p>
          )}

          <PurchaseStatus state={state} onRetry={(pack) => void buy(pack)} onDone={close} />

          {state.status !== 'paid' && state.status !== 'pending' && (
            <>
              {packs.isPending && (
                <output className="flex items-center gap-2 text-sm text-fg-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading packs…
                </output>
              )}
              {packs.isError && (
                <Notice
                  message={{
                    title: 'Couldn’t load the packs',
                    description: 'Check your connection and try again.',
                  }}
                >
                  <Button size="sm" variant="secondary" onClick={() => void packs.refetch()}>
                    Try again
                  </Button>
                </Notice>
              )}
              {packs.data && !packs.data.paymentsEnabled && (
                <Notice
                  tone="info"
                  message={{
                    title: 'Purchases aren’t available yet',
                    description: 'Check back soon.',
                  }}
                />
              )}
              {packs.data?.paymentsEnabled && (
                <ul className="flex flex-col gap-3" aria-label="Credit packs">
                  {packs.data.packs.map((pack, index) => (
                    <PackRow
                      key={pack.id}
                      pack={pack}
                      featured={index === 1}
                      busy={busy}
                      active={'pack' in state && state.pack.id === pack.id && busy}
                      onBuy={() => void buy(pack)}
                    />
                  ))}
                </ul>
              )}
              <p className="text-xs text-fg-subtle">
                Secure payment by Razorpay. Credits don’t expire. 1 credit = 1 generation.
              </p>
            </>
          )}

          <RestoreSection token={token} onRestore={onRestore} />
        </div>
      </div>
    </dialog>
  )
}

function PackRow({
  pack,
  featured,
  busy,
  active,
  onBuy,
}: {
  pack: Pack
  featured: boolean
  busy: boolean
  active: boolean
  onBuy: () => void
}) {
  const perCredit = formatPrice(Math.round(pack.amount / pack.credits), pack.currency)
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-4 rounded-2xl border p-4',
        featured ? 'border-accent bg-accent/5' : 'border-border',
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 font-semibold">
          {pack.credits} credits
          {featured && <Badge tone="accent">Popular</Badge>}
        </span>
        <span className="text-sm text-fg-muted">
          {pack.name} · {perCredit} per generation
        </span>
      </div>
      <Button
        variant={featured ? 'gradient' : 'secondary'}
        onClick={onBuy}
        disabled={busy}
        aria-label={`Buy ${pack.credits} credits for ${formatPrice(pack.amount, pack.currency)}`}
      >
        {active ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {formatPrice(pack.amount, pack.currency)}
      </Button>
    </li>
  )
}

function PurchaseStatus({
  state,
  onRetry,
  onDone,
}: {
  state: PurchaseState
  onRetry: (pack: Pack) => void
  onDone: () => void
}) {
  return (
    <div aria-live="polite">
      {(state.status === 'starting' ||
        state.status === 'checkout' ||
        state.status === 'verifying') && (
        <output className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {state.status === 'starting' && 'Starting secure payment…'}
          {state.status === 'checkout' && 'Complete the payment in the Razorpay window…'}
          {state.status === 'verifying' && 'Confirming your payment…'}
        </output>
      )}
      {state.status === 'paid' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
          <p className="flex items-center gap-2 font-medium">
            <Check className="size-5 text-success" aria-hidden="true" />
            Payment confirmed — {state.pack.credits} credits added
          </p>
          <p className="text-sm text-fg-muted">You now have {state.credits} credits.</p>
          <Button variant="primary" className="self-start" onClick={onDone}>
            <Sparkles aria-hidden="true" />
            Back to my avatar
          </Button>
        </div>
      )}
      {state.status === 'pending' && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-raised p-4">
          <p className="flex items-center gap-2 font-medium">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Payment processing
          </p>
          <p className="text-sm text-fg-muted">
            Razorpay is confirming your payment. Credits appear automatically — you can close this
            window. If money left your account and credits don’t arrive, it’s refunded by your bank.
          </p>
        </div>
      )}
      {state.status === 'failed' && (
        <Notice message={{ title: 'Payment didn’t go through', description: state.message }}>
          <Button size="sm" variant="primary" onClick={() => onRetry(state.pack)}>
            Try again
          </Button>
        </Notice>
      )}
      {state.status === 'cancelled' && (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <CircleAlert className="size-4" aria-hidden="true" />
          Payment cancelled. You haven’t been charged.
        </p>
      )}
    </div>
  )
}

function RestoreSection({
  token,
  onRestore,
}: {
  token: string | null
  onRestore: (code: string) => Promise<void>
}) {
  const inputId = useId()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [copied, setCopied] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!isPlausibleToken(code)) {
      setStatus('error')
      return
    }
    setStatus('working')
    try {
      await onRestore(code)
      setStatus('done')
      setCode('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <details className="rounded-2xl border border-border px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Using another device?</summary>
      <div className="mt-3 flex flex-col gap-3">
        {token && (
          <div className="flex flex-col gap-1.5">
            <p className="text-fg-muted">
              Your restore code moves your credits to another browser. Keep it private — anyone with
              it can use your credits.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => {
                void navigator.clipboard?.writeText(token).then(() => setCopied(true))
              }}
            >
              <Copy aria-hidden="true" />
              {copied ? 'Copied' : 'Copy my restore code'}
            </Button>
          </div>
        )}
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-medium">
            Restore credits from another device
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setStatus('idle')
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste restore code"
              className="min-w-0 flex-1 rounded-xl border border-border bg-canvas px-3 py-2 focus-visible:outline-accent"
            />
            <Button
              size="sm"
              type="submit"
              variant="secondary"
              className="h-10"
              disabled={status === 'working'}
            >
              Restore
            </Button>
          </div>
          <p
            aria-live="polite"
            className={cn('text-xs', status === 'error' ? 'text-danger' : 'text-fg-muted')}
          >
            {status === 'error' && 'That code didn’t work. Check it and try again.'}
            {status === 'done' && 'Restored. Your credits are now on this device.'}
          </p>
        </form>
      </div>
    </details>
  )
}
