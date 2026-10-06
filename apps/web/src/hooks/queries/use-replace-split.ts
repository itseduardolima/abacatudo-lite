import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema, type UpdateTransactionSplitInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

// Dividir muda quem é "meu"/"não é meu" (computeInvoice lê os splits) — mesmos três invalida de
// use-update-transaction-person.ts, pelo mesmo motivo (achado ao vivo: sem isso, fatura/ritmo ficavam
// com número velho até um F5).
export function useReplaceSplit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionSplitInput }) =>
      apiRequest(`/transactions/${id}/split`, { method: 'PUT', body: input, schema: transactionSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['invoice'] })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
