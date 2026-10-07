import { useQuery } from '@tanstack/react-query'
import { estimatedInstallmentsResponseSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useEstimatedInstallments(accountId: string | undefined, month: string | undefined) {
  return useQuery({
    queryKey: ['estimated-installments', accountId, month],
    queryFn: () =>
      apiRequest(`/invoice/estimates?accountId=${accountId}&month=${month}`, {
        schema: estimatedInstallmentsResponseSchema,
      }),
    enabled: Boolean(accountId) && Boolean(month),
  })
}
