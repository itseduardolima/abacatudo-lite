import { useQuery } from '@tanstack/react-query'
import { bankConnectionSchema, type BankConnectionStatus } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

// Sem webhook (07-integracao-bancaria): o front tem que perguntar em polling. Continua perguntando
// enquanto o status ainda não chegou a um estado final — a primeira vez que virar UPDATED, a API já
// sincroniza sozinha (ver BankingService.checkStatus), sem precisar de mais nenhuma chamada.
const PENDING_STATUSES: BankConnectionStatus[] = ['WAITING_USER_INPUT', 'UPDATING']

export function useBankConnectionStatus(id: string | undefined) {
  return useQuery({
    queryKey: ['bank-connection', id],
    queryFn: () => apiRequest(`/banking/items/${id}`, { schema: bankConnectionSchema }),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && !PENDING_STATUSES.includes(query.state.data.status) ? false : 2000,
  })
}
