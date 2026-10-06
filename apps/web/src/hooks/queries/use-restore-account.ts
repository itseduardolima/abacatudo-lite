import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export function useRestoreAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/accounts/${id}/restore`, { method: 'PATCH', schema: z.null() }),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
