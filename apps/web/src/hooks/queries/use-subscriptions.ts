import { useQuery } from '@tanstack/react-query'
import { subscriptionReportSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const SUBSCRIPTIONS_QUERY_KEY = ['subscriptions']

// Assinaturas ativas (9.2): retrato de agora, sem mês.
export function useSubscriptions() {
  return useQuery({
    queryKey: SUBSCRIPTIONS_QUERY_KEY,
    queryFn: () => apiRequest('/insights/subscriptions', { schema: subscriptionReportSchema }),
  })
}
