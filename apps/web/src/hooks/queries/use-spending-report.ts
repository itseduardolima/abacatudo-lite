import { useQuery } from '@tanstack/react-query'
import { spendingReportSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const SPENDING_REPORT_QUERY_KEY = ['spending-report']

export function useSpendingReport(month: string) {
  return useQuery({
    queryKey: [...SPENDING_REPORT_QUERY_KEY, month],
    queryFn: () => apiRequest(`/insights/spending?month=${month}`, { schema: spendingReportSchema }),
  })
}
