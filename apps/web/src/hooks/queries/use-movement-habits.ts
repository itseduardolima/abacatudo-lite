import { useQuery } from '@tanstack/react-query'
import { movementHabitsSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { MOVEMENTS_QUERY_KEY } from './use-movements'

export function useMovementHabits(accountId: string | undefined, month: string) {
  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, 'habits', accountId, month],
    queryFn: () =>
      apiRequest(`/movements/habits?accountId=${accountId}&month=${month}`, { schema: movementHabitsSchema }),
    enabled: Boolean(accountId),
  })
}
