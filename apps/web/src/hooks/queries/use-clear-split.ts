import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

// Desfaz a divisão, volta pro "Eu" sozinho — mesmos invalida de useReplaceSplit (muda "meu"/"não é meu").
export function useClearSplit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/transactions/${id}/split`, { method: 'DELETE', schema: transactionSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['invoice'] })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
