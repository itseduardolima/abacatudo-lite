import { useMutation } from '@tanstack/react-query'
import { connectBankResponseSchema, registerBankItemResponseSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { openPluggyConnect } from '@/lib/pluggy-connect'

export function useConnectBank() {
  return useMutation({
    mutationFn: async (): Promise<string | null> => {
      const { connectToken } = await apiRequest('/banking/items', { method: 'POST', schema: connectBankResponseSchema })
      const pluggyItemId = await openPluggyConnect(connectToken)
      if (!pluggyItemId) return null
      const { id } = await apiRequest('/banking/items/register', {
        method: 'POST',
        body: { pluggyItemId },
        schema: registerBankItemResponseSchema,
      })
      return id
    },
  })
}
