import { useMemo, useState, type ReactNode } from 'react'
import { BillingContext, type BillingContextValue, type UpgradeReason } from '../billingContext'
import { useAccountSession } from '../hooks/useAccountSession'
import { createBillingApi, type BillingApi } from '../lib/api'
import { UpgradeModal } from './UpgradeModal'

/** Account + credits + upgrade modal, for when the app talks to the API. */
export function BillingProvider({
  baseUrl,
  api: injected,
  children,
}: {
  baseUrl: string
  api?: BillingApi
  children: ReactNode
}) {
  const api = useMemo(() => injected ?? createBillingApi(baseUrl), [injected, baseUrl])
  const session = useAccountSession(api)
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason: UpgradeReason }>({
    open: false,
    reason: null,
  })

  const value = useMemo<BillingContextValue>(
    () => ({
      api,
      token: session.token,
      account: session.account,
      status: session.status,
      refresh: session.refresh,
      restore: session.restore,
      openUpgrade: (reason = null) => setUpgrade({ open: true, reason }),
    }),
    [api, session.token, session.account, session.status, session.refresh, session.restore],
  )

  return (
    <BillingContext.Provider value={value}>
      {children}
      <UpgradeModal
        open={upgrade.open}
        reason={upgrade.reason}
        onClose={() => {
          setUpgrade((u) => ({ ...u, open: false }))
          session.refresh()
        }}
        api={api}
        token={session.token}
        account={session.account}
        onRestore={session.restore}
      />
    </BillingContext.Provider>
  )
}
