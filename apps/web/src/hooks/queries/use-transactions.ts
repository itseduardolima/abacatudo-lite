import { useQuery } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const TRANSACTIONS_QUERY_KEY = ['transactions']

export function useTransactions(month?: string) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, month ?? 'current'],
    queryFn: () => apiRequest(`/transactions${month ? `?month=${month}` : ''}`, { schema: z.array(transactionSchema) }),
  })
}
