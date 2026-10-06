import type { MovementHabits } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'

// Gastos que se repetem (03-regras-negocio § Extrato e relatório da conta de benefício): só
// estabelecimentos, nunca Pix. Recorrentes usam o detector de assinaturas do cartão; "mais frequentes" pega
// o que não é mensal (corrida, lanche). Sem categoria — só o nome do estabelecimento.
export function HabitsSection({ habits }: { habits: MovementHabits | undefined }) {
  if (!habits) return null

  return (
    <>
      <section aria-label="Recorrentes">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-bold text-ink">Recorrentes</h3>
          {habits.recurring.items.length > 0 && <MoneyText cents={habits.recurring.totalMonthlyCents} />}
        </div>
        {habits.recurring.items.length === 0 ? (
          <p className="pt-3 text-text">Nenhum gasto recorrente encontrado nos últimos meses.</p>
        ) : (
          <ul className="mt-1">
            {habits.recurring.items.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 border-b border-surface py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{item.label}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    todo dia {item.chargeDay} · {item.occurrences} cobranças
                  </p>
                </div>
                <span className="flex-shrink-0 text-sm text-muted">
                  <MoneyText cents={item.monthlyCents} />
                  /mês
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Mais frequentes">
        <h3 className="text-base font-bold text-ink">Mais frequentes no mês</h3>
        {habits.frequent.length === 0 ? (
          <p className="pt-3 text-text">Nenhum estabelecimento com 2 ou mais compras neste mês.</p>
        ) : (
          <ul className="mt-1">
            {habits.frequent.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 border-b border-surface py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{item.label}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {item.count} compras · última {formatShortDate(item.lastAt)}
                  </p>
                </div>
                <MoneyText cents={item.totalCents} className="flex-shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
