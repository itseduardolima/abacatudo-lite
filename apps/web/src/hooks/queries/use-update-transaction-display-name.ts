import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { STATEMENTS_QUERY_KEY } from './use-statements'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

export function useUpdateTransactionDisplayName() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, displayName }: { id: string; displayName: string | null }) =>
      apiRequest(`/transactions/${id}/display-name`, {
        method: 'PATCH',
        body: { displayName },
        schema: transactionSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_QUERY_KEY })
    },
  })
}
