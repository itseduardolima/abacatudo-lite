import { useQuery } from '@tanstack/react-query'
import { savingsReportSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const SAVINGS_QUERY_KEY = ['savings']

export function useSavings(month: string) {
  return useQuery({
    queryKey: [...SAVINGS_QUERY_KEY, month],
    queryFn: () => apiRequest(`/insights/savings?month=${month}`, { schema: savingsReportSchema }),
  })
}
