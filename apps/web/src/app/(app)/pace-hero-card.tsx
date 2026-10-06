import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { currentMonthKey, formatMonthName } from '@/lib/utils/format-month'

// Card de ritmo (HU 7.4) do hero da Início — extraído pra virar um item do carrossel (Fase 4: o segundo
// item é o saldo de benefício, quando existe).
export function PaceHeroCard({ pace }: { pace: BudgetPace }) {
  const isForecast = pace.month > currentMonthKey()
  const firstHalfSpentPercent =
    pace.capCents > 0 && pace.firstHalfSpentCents !== null
      ? Math.min((pace.firstHalfSpentCents / pace.capCents) * 100, 100)
      : null
  const firstHalfPercent =
    pace.capCents > 0 && pace.firstHalfCapCents > 0
      ? Math.min((pace.firstHalfCapCents / pace.capCents) * 100, 100)
      : null

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

      <div className="relative mt-7 h-3.5 rounded-pill bg-on-inverse-hairline">
        <div
          className="h-full rounded-pill bg-on-inverse-accent"
          style={{ width: `${pace.capCents > 0 ? Math.min((pace.spentCents / pace.capCents) * 100, 100) : 0}%` }}
        />
        {firstHalfPercent !== null && (
          <div
            className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-on-inverse"
            style={{ left: `${firstHalfPercent}%` }}
          />
        )}
        {firstHalfSpentPercent !== null && (
          <div
            className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-on-inverse-marker"
            style={{ left: `${firstHalfSpentPercent}%` }}
          />
        )}
      </div>
      {firstHalfPercent !== null && pace.firstHalfSpentCents !== null && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-on-inverse-muted">
          <span aria-hidden className="h-2 w-2 rounded-full bg-on-inverse-marker" />
          1ª quinzena <MoneyText cents={pace.firstHalfSpentCents} className="!text-on-inverse" /> de{' '}
          <MoneyText cents={pace.firstHalfCapCents} className="!text-on-inverse" />
        </p>
      )}

      <div className="my-4 h-px bg-on-inverse-hairline" />

      <div className="flex justify-between gap-4">
        {pace.currentHalf !== null && pace.currentHalfRemainingCents !== null && (
          <div>
            <p className="text-sm text-on-inverse-muted">Sobram até dia {pace.currentHalf === 1 ? 15 : 30}</p>
            <p className="mt-1 text-xl font-bold text-on-inverse">
              <MoneyText cents={pace.currentHalfRemainingCents} className="!text-on-inverse" />
            </p>
          </div>
        )}
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
