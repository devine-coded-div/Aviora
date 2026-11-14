import { QueryClient } from '@tanstack/react-query'

/** One client for the app's server state (account, credits, packs, provider info). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: true, retry: 1 },
    mutations: { retry: false },
  },
})
