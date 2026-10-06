import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { PEOPLE_QUERY_KEY } from './use-people'

export function useArchivePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    // 204 sem corpo: api-client normaliza pra `null`.
    mutationFn: (id: string) => apiRequest(`/people/${id}/archive`, { method: 'PATCH', schema: z.null() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY }),
  })
}
