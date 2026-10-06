import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { pixRecipientsResponseSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { MOVEMENTS_QUERY_KEY } from './use-movements'

export function usePixRecipients(accountId: string | undefined, month: string, search: string) {
  const params = new URLSearchParams({ accountId: accountId ?? '', month })
  if (search) params.set('search', search)

  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, 'pix-recipients', accountId, month, search],
    queryFn: () =>
      apiRequest(`/movements/pix-recipients?${params.toString()}`, { schema: pixRecipientsResponseSchema }),
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  })
}
