import { useQuery } from '@tanstack/react-query'
import { bankConnectionSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const BANK_CONNECTIONS_QUERY_KEY = ['bank-connections']

export function useBankConnections() {
  return useQuery({
    queryKey: BANK_CONNECTIONS_QUERY_KEY,
    queryFn: () => apiRequest('/banking/items', { schema: z.array(bankConnectionSchema) }),
  })
}
