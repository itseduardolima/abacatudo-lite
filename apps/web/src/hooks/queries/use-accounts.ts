import { useQuery } from '@tanstack/react-query'
import { accountSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const ACCOUNTS_QUERY_KEY = ['accounts']

export function useAccounts() {
  return useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => apiRequest('/accounts', { schema: z.array(accountSchema) }),
  })
}
