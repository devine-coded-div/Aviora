import { Coins, Crown, Loader2, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { useBilling } from '../billingContext'

/** Server-reported free generations and credits, with a way to get more. */
export function CreditsBar() {
  const billing = useBilling()
  if (!billing) return null
  const { status, account, openUpgrade, refresh } = billing

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      {status === 'loading' && (
        <output className="flex items-center gap-2 text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading your credits…
        </output>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-2 text-fg-muted">
          Couldn’t load your credits.
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCcw aria-hidden="true" />
            Retry
          </Button>
        </span>
      )}
      {status === 'ready' && account && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            <span className="font-medium">{account.free.remaining}</span>
            <span className="text-fg-muted"> of {account.free.limit} free left today</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Coins className="size-4 text-amber-200" aria-hidden="true" />
            <span className="font-medium">{account.credits}</span>
            <span className="text-fg-muted">{account.credits === 1 ? 'credit' : 'credits'}</span>
          </span>
        </p>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => openUpgrade(null)}
        disabled={status !== 'ready'}
      >
        <Crown aria-hidden="true" />
        Get credits
      </Button>
    </div>
  )
}
