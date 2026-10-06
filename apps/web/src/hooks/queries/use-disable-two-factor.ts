import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { DisableTwoFactorInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TWO_FACTOR_STATUS_QUERY_KEY } from './use-two-factor-status'

export function useDisableTwoFactor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DisableTwoFactorInput) =>
      apiRequest('/auth/2fa/disable', { method: 'POST', body: input, schema: z.null() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TWO_FACTOR_STATUS_QUERY_KEY }),
  })
}
