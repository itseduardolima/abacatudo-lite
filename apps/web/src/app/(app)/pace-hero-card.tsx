import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { currentMonthKey, formatMonthName } from '@/lib/utils/format-month'

// Card de ritmo (HU 7.4) do hero da Início — extraído pra virar um item do carrossel (Fase 4: o segundo
// item é o saldo de benefício, quando existe).
export function PaceHeroCard({ pace }: { pace: BudgetPace }) {
  const isForecast = pace.month > currentMonthKey()

  return (
    <div className="rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <div className="flex items-center justify-between">
        <p className="text-xs text-on-inverse-muted">
          {isForecast ? 'Meu previsto em' : 'Meu em'} {formatMonthName(pace.month)}
        </p>
      </div>
      <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
        <MoneyText cents={pace.spentCents} className="!text-on-inverse-accent" />
      </p>

      <div className="mt-4 flex gap-6">
        <div>
          <p className="text-xs text-on-inverse-muted">Cartões (só meus)</p>
          <p className="mt-0.5 text-sm font-semibold text-on-inverse">
            <MoneyText cents={pace.cardsMineCents} className="!text-on-inverse" />
          </p>
        </div>
        <div>
          <p className="text-xs text-on-inverse-muted">Gastos fixos</p>
          <p className="mt-0.5 text-sm font-semibold text-on-inverse">
            <MoneyText cents={pace.fixedExpensesCents} className="!text-on-inverse" />
          </p>
        </div>
      </div>

      <div className="mt-5 h-3.5 rounded-pill bg-on-inverse-hairline">
        <div
          className="h-full rounded-pill bg-on-inverse-accent"
          style={{ width: `${pace.capCents > 0 ? Math.min((pace.spentCents / pace.capCents) * 100, 100) : 0}%` }}
        />
      </div>

      <div className="my-4 h-px bg-on-inverse-hairline" />

      <div className="flex justify-between gap-4">
        <div className="ml-auto text-right">
          <p className="text-sm text-on-inverse-muted">Sobram</p>
          <p className="mt-1 text-xl font-bold text-on-inverse">
            <MoneyText cents={pace.remainingCents} className="!text-on-inverse" />
          </p>
        </div>
      </div>
    </div>
  )
}
