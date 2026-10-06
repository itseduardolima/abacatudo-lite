'use client'

import type { MovementReport } from '@gastos/shared'
import { useState } from 'react'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatMoney } from '@/lib/utils/format-money'

type DailyPoint = MovementReport['daily'][number]

// Saídas por dia: uma série só (o título já a nomeia, sem legenda), barras finas ancoradas na linha de
// base e cor de tinta forte (bg-inverse: lima nunca é traço nem marca sobre branco). A altura é só escala
// visual proporcional ao maior dia; todos os valores vêm prontos da API. Toque ou passe o mouse numa barra
// para ver o dia, o valor e o acumulado; a lista abaixo é a versão em texto pra leitores de tela.
export function DailyExpenseChart({ daily }: { daily: DailyPoint[] }) {
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const maxCents = Math.max(0, ...daily.map((point) => point.expenseCents))
  const active = daily.find((point) => point.day === activeDay) ?? null

  return (
    <section aria-label="Saídas por dia">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-ink">Saídas por dia</h3>
        <p className="min-h-[1.25rem] text-right text-xs text-muted">
          {active ? (
            <>
              dia {Number(active.day.slice(8))}: <MoneyText cents={active.expenseCents} className="!text-xs" />, no mês{' '}
              <MoneyText cents={active.cumulativeExpenseCents} className="!text-xs" />
            </>
          ) : (
            'toque numa barra'
          )}
        </p>
      </div>

      <div className="mt-3 flex h-28 items-end gap-[2px] border-b border-border" role="list">
        {daily.map((point) => {
          const height = maxCents > 0 ? (point.expenseCents / maxCents) * 100 : 0
          return (
            <button
              key={point.day}
              type="button"
              role="listitem"
              aria-label={`Dia ${Number(point.day.slice(8))}: saídas de ${formatMoney(point.expenseCents)}`}
              onMouseEnter={() => setActiveDay(point.day)}
              onFocus={() => setActiveDay(point.day)}
              onClick={() => setActiveDay(point.day)}
              className="flex h-full flex-1 items-end"
            >
              <span
                className={`block w-full rounded-t-[4px] ${point.day === activeDay ? 'bg-primary-ink' : 'bg-inverse'}`}
                style={{ height: `${Math.max(height, point.expenseCents > 0 ? 3 : 0)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>1</span>
        <span>{daily.length}</span>
      </div>
    </section>
  )
}
