import { useMutation } from '@tanstack/react-query'
import { loginResultSchema, type VerifyTwoFactorInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useVerifyTwoFactor() {
  return useMutation({
    mutationFn: (input: VerifyTwoFactorInput) =>
      apiRequest('/auth/login/2fa', { method: 'POST', body: input, schema: loginResultSchema }),
  })
}
