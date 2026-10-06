import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { budgetPaceSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useBudgetPace(month?: string) {
  return useQuery({
    queryKey: ['budget-pace', month ?? 'current'],
    queryFn: () => apiRequest(`/budget/pace${month ? `?month=${month}` : ''}`, { schema: budgetPaceSchema }),
    placeholderData: keepPreviousData,
  })
}
