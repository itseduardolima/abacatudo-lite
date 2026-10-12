import type { EstimatedInstallment } from '@gastos/shared'
import { PersonBadge, type BadgePerson } from '@/components/finance/PersonBadge'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'

// Parcelas que o banco ainda não lançou (BB e Pic Pay só mandam a parcela quando ela cai na fatura): mesmo
// valor e mesmo vencimento da última parcela conhecida, mês a mês (03-regras-negocio § Fatura prevista).
// Ficam à parte das lançadas; dá pra atribuir a pessoa (vale pra compra inteira) — quando o banco lança de
// verdade, somem daqui sozinhas.
export interface EstimatedRow extends EstimatedInstallment {
  personName: string | null
  personIsSelf: boolean
  personOthersIndex: number
  splitPeople: BadgePerson[]
}

export interface EstimatedRows {
  totalCents: number
  items: EstimatedRow[]
}

export function EstimatedInstallmentsSection({
  data,
  onSelect,
}: {
  data: EstimatedRows | undefined
  onSelect: (key: string) => void
}) {
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
          <li key={item.key} className="border-b border-surface last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex w-full items-center justify-between gap-3 py-3 text-left"
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
              <div className="flex flex-shrink-0 items-center gap-2">
                <MoneyText cents={item.amountCents} />
                <PersonBadge
                  personName={item.personName}
                  personIsSelf={item.personIsSelf}
                  personOthersIndex={item.personOthersIndex}
                  splitPeople={item.splitPeople}
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
