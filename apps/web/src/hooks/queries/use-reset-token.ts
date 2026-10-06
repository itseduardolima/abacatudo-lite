import { useQuery } from '@tanstack/react-query'
import { resetTokenInfoSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

// retry: false — token inválido/expirado é definitivo (400), tentar de novo não muda o resultado; só
// deixaria a tela "conferindo…" por mais tempo à toa.
export function useResetToken(token: string) {
  return useQuery({
    queryKey: ['auth', 'reset-token', token],
    queryFn: () => apiRequest(`/auth/reset-token/${encodeURIComponent(token)}`, { schema: resetTokenInfoSchema }),
    retry: false,
    enabled: token.length > 0,
  })
}
