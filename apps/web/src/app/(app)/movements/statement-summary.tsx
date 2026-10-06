import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { MovementTotals } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'

// Card de resumo do mês: quanto entrou e quanto saiu nas contas (não entra na sua parte — só consulta).
export function StatementSummary({ totals }: { totals: MovementTotals }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-surface rounded-card bg-canvas shadow-hair">
      <SummaryItem
        label="Entrou"
        cents={totals.incomeCents}
        icon={<ArrowDownLeft size={14} strokeWidth={2.4} />}
        iconClass="bg-tint text-primary-ink"
      />
      <SummaryItem
        label="Saiu"
        cents={totals.expenseCents}
        icon={<ArrowUpRight size={14} strokeWidth={2.4} />}
        iconClass="bg-surface text-ink"
      />
    </div>
  )
}

function SummaryItem({
  label,
  cents,
  icon,
  iconClass,
}: {
  label: string
  cents: number
  icon: React.ReactNode
  iconClass: string
}) {
  return (
    <div className="px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-xl">
        <MoneyText cents={cents} className="!font-bold" />
      </p>
    </div>
  )
}
