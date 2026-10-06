import { useMutation } from '@tanstack/react-query'
import { connectBankResponseSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useConnectBank() {
  return useMutation({
    mutationFn: () => apiRequest('/banking/items', { method: 'POST', schema: connectBankResponseSchema }),
  })
}
