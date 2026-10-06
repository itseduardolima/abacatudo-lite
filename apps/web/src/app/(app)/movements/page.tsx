'use client'

import { Search } from 'lucide-react'
import { AccountFilter } from './account-filter'
import { MovementRow } from './movement-row'
import { StatementSummary } from './statement-summary'
import { useMovementsPage, type DirectionFilter } from './use-movements-page'
import { CardStatementSwitch } from '@/components/layout/CardStatementSwitch'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MonthStepper } from '@/components/ui/MonthStepper'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatMonthName } from '@/lib/utils/format-month'

const DIRECTION_OPTIONS: { value: DirectionFilter; label: string }[] = [
  { value: 'ALL', label: 'Tudo' },
  { value: 'IN', label: 'Entradas' },
  { value: 'OUT', label: 'Saídas' },
]

// Extrato (protótipo 19-extrato): Pix, débito e contas — só consulta. Fundo Fog, folha branca com a lista.
// Nada daqui entra na sua parte nem tem categoria/pessoa (03-regras-negocio § Movimentações).
export default function MovementsPage() {
  const {
    month,
    goToPreviousMonth,
    goToNextMonth,
    statementAccounts,
    accountNameById,
    accountId,
    setAccountId,
    direction,
    setDirection,
    searchInput,
    setSearchInput,
    totals,
    groups,
    isLoading,
    isFiltering,
    errorMessage,
  } = useMovementsPage()

  return (
    <main className="min-h-screen bg-surface pb-28 md:pb-10">
      <div className="mx-auto flex max-w-[420px] flex-col gap-4 px-4 pt-8">
        <div className="flex">
          <CardStatementSwitch active="statement" onSurface />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="display-number text-[2rem] text-ink">Extrato</h1>
            <MonthStepper
              label={`${formatMonthName(month)} ${month.slice(0, 4)}`}
              onPrevious={goToPreviousMonth}
              onNext={goToNextMonth}
            />
          </div>
          <p className="mt-1 text-sm text-muted">Pix, débito e contas · só consulta</p>
        </div>

        {totals && <StatementSummary totals={totals} />}

        <div className="flex flex-col gap-2.5">
          <label className="flex h-11 items-center gap-2 rounded-pill bg-canvas px-4 text-muted shadow-hair">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por descrição ou nome"
              aria-label="Buscar"
              className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
            />
          </label>
          <SegmentedControl label="Tipo" options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          <AccountFilter accounts={statementAccounts} value={accountId} onChange={setAccountId} />
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[420px] rounded-t-[28px] bg-canvas px-4 pb-6 pt-2 md:rounded-[28px]">
        {errorMessage && (
          <div className="pt-3">
            <InlineAlert>{errorMessage}</InlineAlert>
          </div>
        )}
        {isLoading && <p className="pt-4 text-text">Carregando…</p>}
        {!isLoading && !errorMessage && groups.length === 0 && (
          <p className="pt-4 text-text">
            {isFiltering ? 'Buscando…' : 'Nenhuma movimentação com esses filtros neste mês.'}
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="pb-0.5 pt-3.5 text-sm font-semibold text-muted">{group.label}</p>
            {group.items.map((movement) => (
              <MovementRow
                key={movement.id}
                movement={movement}
                accountName={accountNameById.get(movement.accountId) ?? 'Conta'}
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}
