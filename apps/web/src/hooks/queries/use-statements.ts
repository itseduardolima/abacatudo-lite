import { useQuery } from '@tanstack/react-query'
import { statementsResponseSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const STATEMENTS_QUERY_KEY = ['statements']

export function useStatements(month: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...STATEMENTS_QUERY_KEY, month ?? 'current'],
    queryFn: () =>
      apiRequest(`/invoice/statements${month ? `?month=${month}` : ''}`, { schema: statementsResponseSchema }),
    enabled,
    staleTime: 0,
  })
}
