import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncResultSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useSyncBankConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) =>
      apiRequest(`/banking/items/${connectionId}/sync`, { method: 'POST', schema: syncResultSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })
}
