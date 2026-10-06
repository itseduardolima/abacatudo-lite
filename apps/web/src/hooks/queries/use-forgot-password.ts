import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { ForgotPasswordInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiRequest('/auth/forgot-password', { method: 'POST', body: input, schema: z.null() }),
  })
}
