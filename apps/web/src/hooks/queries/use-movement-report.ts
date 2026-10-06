import { useQuery } from '@tanstack/react-query'
import { movementReportSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { MOVEMENTS_QUERY_KEY } from './use-movements'

export function useMovementReport(accountId: string | undefined, month: string) {
  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, 'report', accountId, month],
    queryFn: () =>
      apiRequest(`/movements/report?accountId=${accountId}&month=${month}`, { schema: movementReportSchema }),
    enabled: Boolean(accountId),
  })
}
