import { useMutation, useQueryClient } from '@tanstack/react-query'
import { personSchema, type UpdatePersonInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { PEOPLE_QUERY_KEY } from './use-people'
import { STATEMENTS_QUERY_KEY } from './use-statements'

export function useUpdatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePersonInput }) =>
      apiRequest(`/people/${id}`, { method: 'PATCH', body: input, schema: personSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_QUERY_KEY })
    },
  })
}
