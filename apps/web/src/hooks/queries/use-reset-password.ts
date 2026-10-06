import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { ResetPasswordInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiRequest('/auth/reset-password', { method: 'POST', body: input, schema: z.null() }),
  })
}
