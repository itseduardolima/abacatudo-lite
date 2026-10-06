import { useQuery } from '@tanstack/react-query'
import { accountSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { ACCOUNTS_QUERY_KEY } from './use-accounts'

export function useArchivedAccounts() {
  return useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, 'archived'],
    queryFn: () => apiRequest('/accounts?includeArchived=true', { schema: z.array(accountSchema) }),
    select: (accounts) => accounts.filter((account) => account.archivedAt !== null),
  })
}
