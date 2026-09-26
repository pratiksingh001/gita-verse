import { useQuery } from '@tanstack/react-query'

import { ApiError, apiGet } from '../api/client'
import type { User } from '../api/types'

export const ME_KEY = ['me']
/** Query keys holding the signed-in reader's data; cleared on sign-out. */
export const PERSONAL_KEYS = [['bookmarks'], ['progress'], ['annotations'], ['plans'], ['streak']]

/** The signed-in reader, or null when signed out. */
export function useUser() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () =>
      apiGet<User>('/api/auth/me').catch((e) => {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }),
    retry: false,
  })
}
