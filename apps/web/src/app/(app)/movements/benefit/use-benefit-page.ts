'use client'

import { useState } from 'react'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMovementHabits } from '@/hooks/queries/use-movement-habits'
import { useMovementSpending } from '@/hooks/queries/use-movement-spending'
import { useMovementReport } from '@/hooks/queries/use-movement-report'
import { useMovements } from '@/hooks/queries/use-movements'
import { usePixRecipients } from '@/hooks/queries/use-pix-recipients'
import { usePixTransactions } from '@/hooks/queries/use-pix-transactions'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMonthNavigation } from '@/hooks/use-month-navigation'
import { ApiClientError } from '@/lib/api-client'
import { groupMovementsByDay } from '@/lib/utils/group-movements-by-day'

export type BenefitTab = 'statement' | 'summary'

// Hook de página: só orquestração (04-padroes-codigo). Tudo que é dinheiro (totais, ritmo, saídas por dia,
// Pix por favorecido) vem pronto da API; aqui só se escolhe conta, mês, aba e favorecido aberto.
export function useBenefitPage() {
  const accounts = useAccounts()
  const { month, goToPreviousMonth, goToNextMonth } = useMonthNavigation()
  const [tab, setTab] = useState<BenefitTab>('statement')
  const [pixSearchInput, setPixSearchInput] = useState('')
  const pixSearch = useDebouncedValue(pixSearchInput.trim(), 300)
  const [openRecipient, setOpenRecipient] = useState<{ key: string; name: string } | null>(null)

  const benefitAccount = (accounts.data ?? []).find((account) => account.isBenefitAccount && !account.archivedAt)
  const accountId = benefitAccount?.id

  const report = useMovementReport(accountId, month)
  const movements = useMovements({ month, accountId })
  const spending = useMovementSpending(accountId, month)
  const habits = useMovementHabits(accountId, month)
  const pixRecipients = usePixRecipients(accountId, month, pixSearch)
  const recipientTransactions = usePixTransactions(accountId, month, openRecipient?.key ?? null)

  return {
    isLoadingAccounts: accounts.isPending,
    benefitAccount,
    month,
    goToPreviousMonth,
    goToNextMonth,
    tab,
    setTab,
    report: report.data,
    groups: groupMovementsByDay(movements.data ?? []),
    isLoadingMovements: movements.isPending,
    errorMessage:
      (report.error instanceof ApiClientError && report.error.error.message) ||
      (movements.error instanceof ApiClientError && movements.error.error.message) ||
      null,
    spending: spending.data,
    habits: habits.data,
    pixRecipients: pixRecipients.data,
    pixSearchInput,
    setPixSearchInput,
    openRecipient,
    openRecipientSheet: (key: string, name: string) => setOpenRecipient({ key, name }),
    closeRecipientSheet: () => setOpenRecipient(null),
    recipientTransactions: recipientTransactions.data ?? [],
    isLoadingRecipientTransactions: recipientTransactions.isPending && Boolean(openRecipient),
  }
}
