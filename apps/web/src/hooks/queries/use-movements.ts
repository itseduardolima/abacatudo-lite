import { useQuery } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const MOVEMENTS_QUERY_KEY = ['movements']

export interface MovementFilters {
  month: string
  accountId?: string
  direction?: 'IN' | 'OUT'
  search?: string
}

// Extrato = tudo que não é cartão de crédito (03-regras-negocio § Escopo). Filtros vão pra API, que é quem
// decide o que é entrada e saída.
export function useMovements(filters: MovementFilters) {
  const params = new URLSearchParams({ month: filters.month })
  if (filters.accountId) params.set('accountId', filters.accountId)
  if (filters.direction) params.set('direction', filters.direction)
  if (filters.search) params.set('search', filters.search)

  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, filters],
    queryFn: () => apiRequest(`/movements?${params.toString()}`, { schema: z.array(transactionSchema) }),
  })
}
