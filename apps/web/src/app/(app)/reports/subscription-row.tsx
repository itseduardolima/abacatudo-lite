import type { SubscriptionItem } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'
import { formatDisplayName } from '@/lib/utils/format-display-name'

// Linha de assinatura (protótipo 16-relatorio-assinaturas): inicial, nome, "todo dia N" e o valor mensal.
// A data da última cobrança ajuda a notar assinatura que parou de cobrar.
export function SubscriptionRow({ item }: { item: SubscriptionItem }) {
  const name = formatDisplayName(item.label)

  return (
    <div className="flex items-center gap-3 border-b border-surface py-3.5 last:border-b-0">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-ink">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{name}</p>
        <p className="mt-0.5 text-sm text-muted">
          Todo dia {item.chargeDay} · última em {formatShortDate(item.lastChargeAt)}
        </p>
      </div>
      <MoneyText cents={item.monthlyCents} />
    </div>
  )
}
