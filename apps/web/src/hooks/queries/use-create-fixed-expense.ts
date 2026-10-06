import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fixedExpenseSchema, type CreateFixedExpenseInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { FIXED_EXPENSES_QUERY_KEY } from './use-fixed-expenses'

export function useCreateFixedExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFixedExpenseInput) =>
      apiRequest('/fixed-expenses', { method: 'POST', body: input, schema: fixedExpenseSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FIXED_EXPENSES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
