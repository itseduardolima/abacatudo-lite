import { useMutation, useQueryClient } from '@tanstack/react-query'
import { connectBankResponseSchema, registerBankItemResponseSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { openPluggyConnect } from '@/lib/pluggy-connect'
import { BANK_CONNECTIONS_QUERY_KEY } from './use-bank-connections'

export function useReconnectBank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (connectionId: string): Promise<string | null> => {
      const { connectToken } = await apiRequest(`/banking/items/${connectionId}/reconnect`, {
        method: 'PATCH',
        schema: connectBankResponseSchema,
      })
      const pluggyItemId = await openPluggyConnect(connectToken)
      if (!pluggyItemId) return null
      const { id } = await apiRequest('/banking/items/register', {
        method: 'POST',
        body: { pluggyItemId, replacesId: connectionId },
        schema: registerBankItemResponseSchema,
      })
      return id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BANK_CONNECTIONS_QUERY_KEY }),
  })
}
