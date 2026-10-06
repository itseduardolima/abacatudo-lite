import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountSchema, type UpdateAccountInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { ACCOUNTS_QUERY_KEY } from './use-accounts'

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccountInput }) =>
      apiRequest(`/accounts/${id}`, { method: 'PATCH', body: input, schema: accountSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
  })
}
