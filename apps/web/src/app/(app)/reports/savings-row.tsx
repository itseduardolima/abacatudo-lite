import type { SavingsItem } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatDisplayName } from '@/lib/utils/format-display-name'

const TITLES: Record<SavingsItem['type'], (label: string) => string> = {
  DUPLICATE_CHARGE: (label) => `Possível cobrança duplicada em ${label}`,
  ABOVE_NORMAL_CATEGORY: (label) => `${label} está acima do normal`,
  SUBSCRIPTION: (label) => `Assinatura ${label} para rever`,
}

export function SavingsRow({ item }: { item: SavingsItem }) {
  const label = formatDisplayName(item.label)

  return (
    <div className="border-b border-surface py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[17px] font-bold leading-tight text-ink">{TITLES[item.type](label)}</p>
        <span className="flex-shrink-0 rounded-pill bg-tint px-2.5 py-1 text-xs font-medium text-ink">
          até <MoneyText cents={item.amountCents} className="!text-xs !font-medium !text-ink" />
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted">{item.calculation}</p>
    </div>
  )
}
