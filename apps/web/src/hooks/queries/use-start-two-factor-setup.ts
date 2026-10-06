import { useMutation } from '@tanstack/react-query'
import { twoFactorSetupSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useStartTwoFactorSetup() {
  return useMutation({
    mutationFn: () => apiRequest('/auth/2fa/setup', { method: 'POST', schema: twoFactorSetupSchema }),
  })
}
