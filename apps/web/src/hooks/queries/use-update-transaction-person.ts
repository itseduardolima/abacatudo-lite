import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema, type UpdateTransactionPersonInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

export function useUpdateTransactionPerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionPersonInput }) =>
      apiRequest(`/transactions/${id}/person`, { method: 'PATCH', body: input, schema: transactionSchema }),
    // Trocar a pessoa muda quem é "meu"/"não é meu" — sem invalidar fatura e ritmo, o card ficava com
    // número velho até um F5 (achado ao vivo: nada atualizava sozinho depois de reatribuir).
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['invoice'] })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
