import { useQuery } from '@tanstack/react-query'
import { categorySchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export const CATEGORIES_QUERY_KEY = ['categories']

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => apiRequest('/categories', { schema: z.array(categorySchema) }),
  })
}
