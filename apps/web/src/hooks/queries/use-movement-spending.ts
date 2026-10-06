import { useQuery } from '@tanstack/react-query'
import { movementSpendingSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { MOVEMENTS_QUERY_KEY } from './use-movements'

export function useMovementSpending(accountId: string | undefined, month: string) {
  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, 'spending', accountId, month],
    queryFn: () =>
      apiRequest(`/movements/spending?accountId=${accountId}&month=${month}`, { schema: movementSpendingSchema }),
    enabled: Boolean(accountId),
  })
}
