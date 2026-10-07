'use client'

import { SavingsRowsSkeleton, TotalSkeleton } from './reports-skeleton'
import { SavingsRow } from './savings-row'
import { MoneyText } from '@/components/finance/MoneyText'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { useSavings } from '@/hooks/queries/use-savings'
import { ApiClientError } from '@/lib/api-client'

export function SavingsSection({ month }: { month: string }) {
  const savings = useSavings(month)
  const report = savings.data
  const errorMessage = savings.error instanceof ApiClientError ? savings.error.error.message : null
  const totalCents = report?.items.reduce((sum, item) => sum + item.amountCents, 0) ?? 0

  return (
    <div className="flex flex-col gap-5">
      {errorMessage && <InlineAlert>{errorMessage}</InlineAlert>}
      {savings.isPending && (
        <>
          <TotalSkeleton extraLines={1} />
          <SavingsRowsSkeleton />
        </>
      )}

      {report && report.items.length === 0 && (
        <p className="text-text">
          Nada pra economizar neste mês — nenhuma cobrança duplicada, categoria acima do normal ou assinatura ativa.
        </p>
      )}

      {report && report.items.length > 0 && (
        <>
          <section>
            <p className="text-sm text-muted">Você pode economizar por mês</p>
            <p className="display-number mt-1 text-[2.75rem] text-primary-ink">
              <MoneyText cents={totalCents} className="!text-primary-ink" />
            </p>
            <p className="mt-1.5 text-sm text-muted">
              São sugestões. Cada uma mostra a conta, e você decide o que faz sentido.
            </p>
          </section>

          <div>
            {report.items.map((item) => (
              <SavingsRow key={item.sourceKey} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
