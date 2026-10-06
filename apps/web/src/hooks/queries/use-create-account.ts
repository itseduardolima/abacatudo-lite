import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountSchema, type CreateAccountInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { ACCOUNTS_QUERY_KEY } from './use-accounts'

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      apiRequest('/accounts', { method: 'POST', body: input, schema: accountSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
  })
}
