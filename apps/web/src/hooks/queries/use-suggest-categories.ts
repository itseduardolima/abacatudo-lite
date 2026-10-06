import { useMutation, useQueryClient } from '@tanstack/react-query'
import { suggestCategoriesOutcomeSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

export function useSuggestCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest('/ai/suggest-categories', { method: 'POST', schema: suggestCategoriesOutcomeSchema }),
    onSuccess: (outcome) => {
      if (outcome.status === 'DONE' && (outcome.suggested ?? 0) + (outcome.appliedFromCache ?? 0) > 0) {
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      }
    },
  })
}
