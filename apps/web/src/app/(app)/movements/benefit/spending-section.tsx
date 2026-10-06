import type { MovementSpending } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'

// "Para onde vai" (03-regras-negocio § Extrato e relatório da conta de benefício): saídas por
// estabelecimento, maiores primeiro; Pix, pagamento de fatura e "outros" fecham a conta. A barra é só escala
// visual proporcional ao maior item — todos os valores vêm prontos da API. Sem categoria.
export function SpendingSection({ spending }: { spending: MovementSpending | undefined }) {
  if (!spending) return null

  const lines = [
    ...spending.establishments.map((item) => ({
      key: item.key,
      label: item.label,
      detail: `${item.count} ${item.count === 1 ? 'compra' : 'compras'}`,
      cents: item.totalCents,
    })),
    ...(spending.otherCents > 0
      ? [{ key: 'other', label: 'Outros estabelecimentos', detail: '', cents: spending.otherCents }]
      : []),
    ...(spending.pixCents > 0
      ? [{ key: 'pix', label: 'Pix enviados', detail: 'detalhe abaixo', cents: spending.pixCents }]
      : []),
    ...(spending.cardPaymentCents > 0
      ? [{ key: 'card-payment', label: 'Pagamento de fatura', detail: '', cents: spending.cardPaymentCents }]
      : []),
  ]
  const maxCents = Math.max(0, ...lines.map((line) => line.cents))

  return (
    <section aria-label="Para onde vai">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-ink">Para onde vai</h3>
        <MoneyText cents={spending.totalCents} />
      </div>
      {lines.length === 0 ? (
        <p className="pt-3 text-text">Nenhuma saída neste mês.</p>
      ) : (
        <ul className="mt-1">
          {lines.map((line) => (
            <li key={line.key} className="border-b border-surface py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-medium text-ink">{line.label}</p>
                <MoneyText cents={line.cents} className="flex-shrink-0" />
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface">
                <div
                  className="h-full rounded-pill bg-inverse"
                  style={{ width: `${maxCents > 0 ? (line.cents / maxCents) * 100 : 0}%` }}
                />
              </div>
              {line.detail && <p className="mt-1 text-xs text-muted">{line.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
