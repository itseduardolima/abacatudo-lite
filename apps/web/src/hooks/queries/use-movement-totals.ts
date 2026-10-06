import { useQuery } from '@tanstack/react-query'
import { movementTotalsSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { MOVEMENTS_QUERY_KEY } from './use-movements'

export function useMovementTotals(month: string) {
  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, 'totals', month],
    queryFn: () => apiRequest(`/movements/totals?month=${month}`, { schema: movementTotalsSchema }),
  })
}
