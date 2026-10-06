import { useMutation, useQueryClient } from '@tanstack/react-query'
import { twoFactorRecoveryCodesSchema, type ConfirmTwoFactorInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TWO_FACTOR_STATUS_QUERY_KEY } from './use-two-factor-status'

export function useConfirmTwoFactor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConfirmTwoFactorInput) =>
      apiRequest('/auth/2fa/confirm', { method: 'POST', body: input, schema: twoFactorRecoveryCodesSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TWO_FACTOR_STATUS_QUERY_KEY }),
  })
}
