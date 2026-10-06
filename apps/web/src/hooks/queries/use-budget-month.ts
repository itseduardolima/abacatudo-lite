import { useQuery } from '@tanstack/react-query'
import { budgetMonthSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const BUDGET_MONTH_QUERY_KEY = ['budget-month']

export function useBudgetMonth() {
  return useQuery({
    queryKey: BUDGET_MONTH_QUERY_KEY,
    queryFn: () => apiRequest('/budget/month', { schema: budgetMonthSchema }),
  })
}
