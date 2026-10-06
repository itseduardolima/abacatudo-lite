import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fixedExpenseSchema, type UpdateFixedExpenseInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { FIXED_EXPENSES_QUERY_KEY } from './use-fixed-expenses'

export function useUpdateFixedExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateFixedExpenseInput & { id: string }) =>
      apiRequest(`/fixed-expenses/${id}`, { method: 'PATCH', body: input, schema: fixedExpenseSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FIXED_EXPENSES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
