import { useMutation } from '@tanstack/react-query'
import { loginResultSchema, type LoginInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest('/auth/login', { method: 'POST', body: input, schema: loginResultSchema }),
  })
}
