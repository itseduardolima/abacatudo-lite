import { useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetMonthSchema, type UpdateBudgetMonthInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { BUDGET_MONTH_QUERY_KEY } from './use-budget-month'

export function useUpdateBudgetMonth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateBudgetMonthInput) =>
      apiRequest('/budget/month', { method: 'PUT', body: input, schema: budgetMonthSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUDGET_MONTH_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
