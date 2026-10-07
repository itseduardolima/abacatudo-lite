import type { EstimatedInstallmentsResponse } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'

// Parcelas que o banco ainda não lançou (BB e Pic Pay só mandam a parcela quando ela cai na fatura): mesmo
// valor e mesmo vencimento da última parcela conhecida, mês a mês (03-regras-negocio § Fatura prevista).
// Ficam à parte das lançadas e sem edição — quando o banco lança de verdade, somem daqui sozinhas.
export function EstimatedInstallmentsSection({ data }: { data: EstimatedInstallmentsResponse | undefined }) {
  if (!data || data.items.length === 0) return null

  return (
    <section aria-label="Parcelas estimadas">
      <div className="flex items-baseline justify-between gap-3 pt-3.5">
        <h3 className="text-sm font-semibold text-muted">Parcelas estimadas</h3>
        <MoneyText cents={data.totalCents} className="!text-sm" />
      </div>
      <p className="mt-0.5 text-xs text-muted">
        O banco ainda não lançou. Usamos o mesmo valor e o mesmo vencimento da última parcela.
      </p>
      <ul className="mt-1">
        {data.items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-3 border-b border-surface py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{item.label}</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                <span>
                  {item.installmentNumber}/{item.installmentTotal} · {formatShortDate(item.dueAt)}
                </span>
                <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-medium text-text">estimada</span>
              </p>
            </div>
            <MoneyText cents={item.amountCents} className="flex-shrink-0" />
          </li>
        ))}
      </ul>
    </section>
  )
}
