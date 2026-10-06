import { useMutation, useQueryClient } from '@tanstack/react-query'
import { personSchema, type CreatePersonInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { PEOPLE_QUERY_KEY } from './use-people'

export function useCreatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePersonInput) =>
      apiRequest('/people', { method: 'POST', body: input, schema: personSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY }),
  })
}
