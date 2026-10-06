import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { ChangePasswordInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiRequest('/auth/password', { method: 'PATCH', body: input, schema: z.null() }),
  })
}
