import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { BUDGET_MONTH_QUERY_KEY } from './use-budget-month'
import { SAVINGS_QUERY_KEY } from './use-savings'
import { SPENDING_REPORT_QUERY_KEY } from './use-spending-report'
import { STATEMENTS_QUERY_KEY } from './use-statements'
import { SUBSCRIPTIONS_QUERY_KEY } from './use-subscriptions'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

export function useUpdateTransactionCancellation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancelled }: { id: string; cancelled: boolean }) =>
      apiRequest(`/transactions/${id}/cancellation`, {
        method: 'PATCH',
        body: { cancelled },
        schema: transactionSchema,
      }),
    onSuccess: () => {
      for (const queryKey of [
        TRANSACTIONS_QUERY_KEY,
        STATEMENTS_QUERY_KEY,
        BUDGET_MONTH_QUERY_KEY,
        SPENDING_REPORT_QUERY_KEY,
        SUBSCRIPTIONS_QUERY_KEY,
        SAVINGS_QUERY_KEY,
        ['invoice'],
        ['budget-pace'],
      ]) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
