import { useQuery } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { MOVEMENTS_QUERY_KEY } from './use-movements'

export function usePixTransactions(accountId: string | undefined, month: string, recipientKey: string | null) {
  const params = new URLSearchParams({ accountId: accountId ?? '', month, recipient: recipientKey ?? '' })

  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, 'pix', accountId, month, recipientKey],
    queryFn: () => apiRequest(`/movements/pix?${params.toString()}`, { schema: z.array(transactionSchema) }),
    enabled: Boolean(accountId) && Boolean(recipientKey),
  })
}
