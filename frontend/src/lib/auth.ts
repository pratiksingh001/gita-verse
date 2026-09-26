import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiGet, apiSend } from '../api/client'
import type { User } from '../api/types'
import { ME_KEY, PERSONAL_KEYS } from './account'
import { syncLocalToAccount } from './reading'

export function useAuthConfig() {
  return useQuery({
    queryKey: ['auth-config'],
    queryFn: () => apiGet<{ google_client_id: string | null }>('/api/auth/config'),
  })
}

function useAuthMutation<Body>(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Body) => apiSend<User>('POST', path, body),
    onSuccess: async (user) => {
      queryClient.setQueryData(ME_KEY, user)
      // Not fatal if it fails: the browser copy stays and syncs on the next sign-in.
      await syncLocalToAccount(queryClient).catch(() => {})
    },
  })
}

export const useSignIn = () => useAuthMutation<{ email: string; password: string }>('/api/auth/login')
export const useRegister = () =>
  useAuthMutation<{ name: string; email: string; password: string }>('/api/auth/register')
export const useGoogleSignIn = () => useAuthMutation<{ credential: string }>('/api/auth/google')

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiSend('POST', '/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(ME_KEY, null)
      for (const key of PERSONAL_KEYS) queryClient.removeQueries({ queryKey: key })
    },
  })
}
