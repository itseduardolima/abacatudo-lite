import { useQuery } from '@tanstack/react-query'
import { personSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const PEOPLE_QUERY_KEY = ['people']

export function usePeople() {
  return useQuery({
    queryKey: PEOPLE_QUERY_KEY,
    queryFn: () => apiRequest('/people', { schema: z.array(personSchema) }),
  })
}
