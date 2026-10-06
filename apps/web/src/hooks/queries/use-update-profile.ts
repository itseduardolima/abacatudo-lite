import { useMutation, useQueryClient } from '@tanstack/react-query'
import { currentUserSchema, type UpdateProfileInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { ME_QUERY_KEY } from './use-me'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiRequest('/auth/profile', { method: 'PATCH', body: input, schema: currentUserSchema }),
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}
