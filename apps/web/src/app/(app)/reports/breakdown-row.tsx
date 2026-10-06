import type { SpendingBreakdownItem } from '@gastos/shared'
import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatDisplayName } from '@/lib/utils/format-display-name'
import { formatVariation } from '@/lib/utils/format-variation'

// Linha de "Para onde vai" (protótipo 15-relatorio-categorias): nome, valor, barra proporcional à maior
// linha e a variação vs. a média dos 3 meses. O selo de alerta só aparece quando a API marca `aboveNormal`
// (> 140% da média) — a regra é do backend, não daqui.
export function BreakdownRow({
  item,
  maxCents,
  icon: Icon,
}: {
  item: SpendingBreakdownItem
  maxCents: number
  icon?: LucideIcon
}) {
  const variation = formatVariation(item.vsAverageLast3MonthsPercent)
  const label = formatDisplayName(item.label)
  const width = maxCents > 0 ? Math.max(0, Math.min((item.amountCents / maxCents) * 100, 100)) : 0

  return (
    <div className="flex flex-col gap-2 border-b border-surface py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-ink">
          {Icon ? <Icon size={18} strokeWidth={1.8} aria-hidden="true" /> : label.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{label}</span>
        <MoneyText cents={item.amountCents} />
      </div>
      <div className="flex items-center gap-3 pl-12">
        <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface" aria-hidden="true">
          <div className="h-full rounded-pill bg-primary" style={{ width: `${width}%` }} />
        </div>
        <div className="flex w-[4.75rem] flex-shrink-0 justify-end">
          {item.aboveNormal ? (
            <span className="flex items-center gap-1 rounded-pill bg-tint px-2.5 py-0.5 text-xs font-semibold text-ink">
              <AlertTriangle size={12} strokeWidth={2.4} aria-hidden="true" />
              {variation}
            </span>
          ) : (
            <span className="text-xs text-muted">{variation ?? ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}
