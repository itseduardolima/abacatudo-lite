import { useQuery } from '@tanstack/react-query'
import { currentUserSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export const ME_QUERY_KEY = ['auth', 'me']

// 401 (sem sessão válida) vira erro da query — quem chama decide o que fazer (ex.: mandar pro login); nunca
// redireciona sozinho aqui dentro (hook de dado só busca, não orquestra navegação).
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => apiRequest('/auth/me', { schema: currentUserSchema }),
    retry: false,
  })
}
