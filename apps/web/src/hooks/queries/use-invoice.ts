import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { accountInvoiceSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

function invoiceQuery(accountId: string, month?: string) {
  return {
    queryKey: ['invoice', accountId, month ?? 'current'],
    queryFn: () =>
      apiRequest(`/invoice?accountId=${accountId}${month ? `&month=${month}` : ''}`, { schema: accountInvoiceSchema }),
  }
}

export function useInvoice(accountId: string | undefined, month?: string) {
  return useQuery({ ...invoiceQuery(accountId ?? '', month), enabled: Boolean(accountId) })
}

export function useInvoices(accountIds: string[], month?: string) {
  return useQueries({
    queries: accountIds.map((accountId) => ({ ...invoiceQuery(accountId, month), placeholderData: keepPreviousData })),
  })
}
