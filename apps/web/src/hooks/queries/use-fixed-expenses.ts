import { useQuery } from '@tanstack/react-query'
import { fixedExpenseSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const FIXED_EXPENSES_QUERY_KEY = ['fixed-expenses']

export function useFixedExpenses() {
  return useQuery({
    queryKey: FIXED_EXPENSES_QUERY_KEY,
    queryFn: () => apiRequest('/fixed-expenses', { schema: z.array(fixedExpenseSchema) }),
  })
}
