import { useMutation } from '@tanstack/react-query'
import { splitPreviewSchema, type PreviewSplitInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

// Só calcula (dinheiro nunca no frontend, 04-padroes-codigo) — não grava nada, é o "dividir igualmente"
// enquanto a pessoa ainda está escolhendo quem entra na divisão.
export function usePreviewSplit() {
  return useMutation({
    mutationFn: ({ id, personIds }: { id: string; personIds: string[] }) =>
      apiRequest(`/transactions/${id}/split/preview`, {
        method: 'POST',
        body: { personIds } satisfies PreviewSplitInput,
        schema: splitPreviewSchema,
      }),
  })
}
