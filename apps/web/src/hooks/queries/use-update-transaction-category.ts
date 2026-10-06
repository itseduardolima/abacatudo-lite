import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema, type UpdateTransactionCategoryInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionCategoryInput }) =>
      apiRequest(`/transactions/${id}/category`, { method: 'PATCH', body: input, schema: transactionSchema }),
    // Categoria não muda quem é "meu"/"não é meu" (só pessoa/split mudam), mas a lista de transações e o
    // que aparece nela sim — invalida só o necessário aqui.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
  })
}
