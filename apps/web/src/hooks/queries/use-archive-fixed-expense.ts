import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { FIXED_EXPENSES_QUERY_KEY } from './use-fixed-expenses'

export function useArchiveFixedExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    // 204 sem corpo: api-client normaliza pra `null`.
    mutationFn: (id: string) => apiRequest(`/fixed-expenses/${id}/archive`, { method: 'PATCH', schema: z.null() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FIXED_EXPENSES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
