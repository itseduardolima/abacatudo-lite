'use client'

import { useState } from 'react'
import { useSpendingReport } from '@/hooks/queries/use-spending-report'
import { useMonthNavigation } from '@/hooks/use-month-navigation'
import { ApiClientError } from '@/lib/api-client'

export type ReportView = 'category' | 'merchant' | 'person'
export type ReportTab = 'spending' | 'subscriptions' | 'savings'

// Hook de página: só orquestração (04-padroes-codigo). Todos os números (total, variações, "acima do
// normal") vêm prontos da API; aqui só escolhe qual lista mostrar.
export function useReportsPage() {
  const { month, goToPreviousMonth, goToNextMonth } = useMonthNavigation()
  const [tab, setTab] = useState<ReportTab>('spending')
  const [view, setView] = useState<ReportView>('category')
  const report = useSpendingReport(month)

  const items = report.data
    ? { category: report.data.byCategory, merchant: report.data.byMerchant, person: report.data.byPerson }[view]
    : []

  return {
    month,
    goToPreviousMonth,
    goToNextMonth,
    tab,
    setTab,
    view,
    setView,
    report: report.data,
    items,
    isLoading: report.isPending,
    errorMessage: report.error instanceof ApiClientError ? report.error.error.message : null,
  }
}
