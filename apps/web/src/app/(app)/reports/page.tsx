'use client'

import { BreakdownRow } from './breakdown-row'
import { BreakdownRowsSkeleton, TotalSkeleton } from './reports-skeleton'
import { SavingsSection } from './savings-section'
import { SubscriptionsSection } from './subscriptions-section'
import { useReportsPage, type ReportTab, type ReportView } from './use-reports-page'
import { MoneyText } from '@/components/finance/MoneyText'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MonthStepper } from '@/components/ui/MonthStepper'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { categoryIcon } from '@/lib/utils/category-icon'
import { formatMonthName } from '@/lib/utils/format-month'

const TAB_OPTIONS: { value: ReportTab; label: string }[] = [
  { value: 'spending', label: 'Para onde vai' },
  { value: 'subscriptions', label: 'Assinaturas' },
  { value: 'savings', label: 'Economizar' },
]

const VIEW_OPTIONS: { value: ReportView; label: string }[] = [
  { value: 'category', label: 'Categorias' },
  { value: 'merchant', label: 'Lugares' },
  { value: 'person', label: 'Pessoas' },
]

const CAPTIONS: Record<ReportView, string> = {
  category:
    'Só compras no cartão de crédito, na sua parte. A variação compara com os 3 meses anteriores; o selo marca o que passou de 140% da média.',
  merchant: 'Só compras no cartão de crédito, na sua parte. A variação compara com os 3 meses anteriores.',
  person: 'Todas as pessoas que usaram seus cartões, não só a sua parte. A variação compara com os 3 meses anteriores.',
}

// Relatórios (protótipos 15 e 16): "Para onde vai" e "Assinaturas". Só view: o total, as variações, o selo de
// "acima do normal" e os totais das assinaturas são calculados pela API (dinheiro nunca é calculado no
// frontend).
export default function ReportsPage() {
  const {
    month,
    goToPreviousMonth,
    goToNextMonth,
    tab,
    setTab,
    view,
    setView,
    report,
    items,
    isLoading,
    errorMessage,
  } = useReportsPage()
  const maxCents = items.reduce((max, item) => Math.max(max, item.amountCents), 0)

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-5 px-4 pb-28 pt-8 md:pb-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display-number text-[2rem] text-ink">Relatórios</h1>
        {(tab === 'spending' || tab === 'savings') && (
          <MonthStepper
            label={`${formatMonthName(month)} ${month.slice(0, 4)}`}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
          />
        )}
      </div>

      <SegmentedControl label="Relatório" options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === 'subscriptions' && <SubscriptionsSection />}

      {tab === 'savings' && <SavingsSection month={month} />}

      {tab === 'spending' && (
        <>
          {isLoading && !report && <TotalSkeleton />}
          {report && (
            <section>
              <p className="text-sm text-muted">
                Sua parte em {formatMonthName(month)}
                {report.throughDay !== null && `, até o dia ${report.throughDay}`}
              </p>
              <p className="display-number mt-1 text-[2.75rem] text-primary-ink">
                <MoneyText cents={report.totalCents} className="!text-primary-ink" />
              </p>
            </section>
          )}

          <SegmentedControl label="Agrupar por" options={VIEW_OPTIONS} value={view} onChange={setView} />

          {errorMessage && <InlineAlert>{errorMessage}</InlineAlert>}
          {isLoading && <BreakdownRowsSkeleton />}
          {!isLoading && !errorMessage && items.length === 0 && (
            <p className="text-text">Nenhuma compra no cartão neste mês.</p>
          )}

          {items.length > 0 && (
            <div>
              {items.map((item) => (
                <BreakdownRow
                  key={item.key}
                  item={item}
                  maxCents={maxCents}
                  icon={view === 'category' ? categoryIcon(item.label) : undefined}
                />
              ))}
              <p className="pt-3 text-sm text-muted">{CAPTIONS[view]}</p>
            </div>
          )}
        </>
      )}
    </main>
  )
}
