import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { ACCOUNTS_QUERY_KEY } from './use-accounts'

export function useArchiveAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    // 204 sem corpo: api-client normaliza pra `null`.
    mutationFn: (id: string) => apiRequest(`/accounts/${id}/archive`, { method: 'PATCH', schema: z.null() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
