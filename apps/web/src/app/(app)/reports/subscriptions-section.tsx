'use client'

import { SubscriptionRow } from './subscription-row'
import { MoneyText } from '@/components/finance/MoneyText'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { useSubscriptions } from '@/hooks/queries/use-subscriptions'
import { ApiClientError } from '@/lib/api-client'

// Aba "Assinaturas" (protótipo 16-relatorio-assinaturas): total por mês, quantas são e total por ano, e a
// lista. Tudo calculado pela API (o anual é 12x o mensal, no backend).
export function SubscriptionsSection() {
  const subscriptions = useSubscriptions()
  const report = subscriptions.data
  const errorMessage = subscriptions.error instanceof ApiClientError ? subscriptions.error.error.message : null

  return (
    <div className="flex flex-col gap-5">
      {errorMessage && <InlineAlert>{errorMessage}</InlineAlert>}
      {subscriptions.isPending && <p className="text-text">Carregando…</p>}

      {report && report.items.length === 0 && (
        <p className="text-text">
          Nenhuma assinatura encontrada. Aparecem aqui cobranças do mesmo lugar, de valor parecido, todo mês.
        </p>
      )}

      {report && report.items.length > 0 && (
        <>
          <section>
            <p className="text-sm text-muted">Assinaturas ativas</p>
            <p className="display-number mt-1 text-[2.75rem] text-primary-ink">
              <MoneyText cents={report.totalMonthlyCents} className="!text-primary-ink" />
            </p>
            <p className="mt-1 font-semibold text-ink">
              por mês, em {report.items.length} {report.items.length === 1 ? 'assinatura' : 'assinaturas'}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              <MoneyText cents={report.totalYearlyCents} className="!font-medium !text-muted" /> por ano
            </p>
          </section>

          <div>
            {report.items.map((item) => (
              <SubscriptionRow key={item.key} item={item} />
            ))}
            <p className="pt-3 text-sm text-muted">
              Cobranças do mesmo lugar, de valor parecido, a cada cerca de 30 dias, na sua parte. Só as que cobraram nos
              últimos 40 dias.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
