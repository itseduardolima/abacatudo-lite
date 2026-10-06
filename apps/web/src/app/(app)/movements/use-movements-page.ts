'use client'

import { useState } from 'react'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMovementTotals } from '@/hooks/queries/use-movement-totals'
import { useMovements } from '@/hooks/queries/use-movements'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMonthNavigation } from '@/hooks/use-month-navigation'
import { ApiClientError } from '@/lib/api-client'
import { groupMovementsByDay } from '@/lib/utils/group-movements-by-day'

export type DirectionFilter = 'ALL' | 'IN' | 'OUT'

// Hook de página: só orquestração (04-padroes-codigo). Filtros (mês, conta, entradas/saídas, busca) vão
// direto pra API; totais e "o que é entrada/saída" também vêm dela — aqui nenhuma conta de dinheiro.
export function useMovementsPage() {
  const accounts = useAccounts()
  const { month, goToPreviousMonth, goToNextMonth } = useMonthNavigation()
  const [accountId, setAccountId] = useState('')
  const [direction, setDirection] = useState<DirectionFilter>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput.trim(), 300)

  const movements = useMovements({
    month,
    accountId: accountId || undefined,
    direction: direction === 'ALL' ? undefined : direction,
    search: search || undefined,
  })
  const totals = useMovementTotals(month)

  const statementAccounts = (accounts.data ?? []).filter(
    (account) => account.type !== 'CREDIT_CARD' && !account.archivedAt,
  )
  const hasBenefitAccount = (accounts.data ?? []).some((account) => account.isBenefitAccount && !account.archivedAt)
  const accountNameById = new Map((accounts.data ?? []).map((account) => [account.id, account.name]))

  const groups = groupMovementsByDay(movements.data ?? [])

  return {
    month,
    goToPreviousMonth,
    goToNextMonth,
    statementAccounts,
    hasBenefitAccount,
    accountNameById,
    accountId,
    setAccountId,
    direction,
    setDirection,
    searchInput,
    setSearchInput,
    totals: totals.data,
    groups,
    isLoading: accounts.isPending || movements.isPending,
    isFiltering: searchInput.trim() !== search,
    errorMessage: movements.error instanceof ApiClientError ? movements.error.error.message : null,
  }
}
