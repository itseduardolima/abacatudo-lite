import { useQuery } from '@tanstack/react-query'
import { twoFactorStatusSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const TWO_FACTOR_STATUS_QUERY_KEY = ['auth', '2fa']

export function useTwoFactorStatus() {
  return useQuery({
    queryKey: TWO_FACTOR_STATUS_QUERY_KEY,
    queryFn: () => apiRequest('/auth/2fa', { schema: twoFactorStatusSchema }),
  })
}
