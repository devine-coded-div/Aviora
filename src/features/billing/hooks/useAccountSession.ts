import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { BillingApiError, type BillingApi } from '../lib/api'
import { readAccountToken, writeAccountToken } from '../lib/session'

/**
 * Make sure this browser has an account: reuse the stored token if the server still knows it,
 * otherwise create a new anonymous account. Entitlements are then always read from the server.
 */
export function useAccountSession(api: BillingApi) {
  const queryClient = useQueryClient()

  const session = useQuery({
    queryKey: ['billing', 'session'],
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
    queryFn: async () => {
      const stored = readAccountToken()
      if (stored) {
        try {
          const account = await api.account(stored)
          queryClient.setQueryData(['billing', 'account', stored], account)
          return stored
        } catch (error) {
          if (!(error instanceof BillingApiError && error.status === 401)) throw error
        }
      }
      const created = await api.createAccount()
      writeAccountToken(created.token)
      queryClient.setQueryData(['billing', 'account', created.token], created.account)
      return created.token
    },
  })

  const token = session.data ?? null
  const account = useQuery({
    queryKey: ['billing', 'account', token],
    queryFn: () => api.account(token!),
    enabled: token !== null,
    staleTime: 15_000,
  })

  const sessionFailed = session.isError
  const refetchSession = session.refetch
  const refresh = useCallback(() => {
    // If we never got an account, retry that; otherwise just re-read balances.
    if (sessionFailed) void refetchSession()
    else void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
  }, [queryClient, sessionFailed, refetchSession])

  const restore = useCallback(
    async (code: string) => {
      const trimmed = code.trim()
      const restored = await api.account(trimmed) // throws 401 for unknown codes
      writeAccountToken(trimmed)
      queryClient.setQueryData(['billing', 'account', trimmed], restored)
      queryClient.setQueryData(['billing', 'session'], trimmed)
    },
    [api, queryClient],
  )

  const status: 'loading' | 'ready' | 'error' =
    session.isError || account.isError ? 'error' : account.data ? 'ready' : 'loading'

  return { token, account: account.data, status, refresh, restore }
}
