'use client'

import { useBenefitPage, type BenefitTab } from './use-benefit-page'
import { DailyExpenseChart } from './daily-expense-chart'
import { HabitsSection } from './habits-section'
import { SpendingSection } from './spending-section'
import { PixRecipientSheet } from './pix-recipient-sheet'
import { PixRecipientsSection } from './pix-recipients-section'
import { MovementRow } from '../movement-row'
import { StatementSummary } from '../statement-summary'
import { CardStatementSwitch } from '@/components/layout/CardStatementSwitch'
import { MoneyText } from '@/components/finance/MoneyText'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MonthStepper } from '@/components/ui/MonthStepper'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatSyncedAt } from '@/lib/utils/format-date'
import { formatMonthName } from '@/lib/utils/format-month'

const TAB_OPTIONS: { value: BenefitTab; label: string }[] = [
  { value: 'statement', label: 'Extrato' },
  { value: 'summary', label: 'Resumo' },
]

// Conta de benefício (03-regras-negocio § Extrato e relatório da conta de benefício): consulta descritiva,
// separada do cartão. Nada daqui entra no orçamento, no ritmo do cartão nem na IA.
export default function BenefitPage() {
  const {
    isLoadingAccounts,
    benefitAccount,
    month,
    goToPreviousMonth,
    goToNextMonth,
    tab,
    setTab,
    report,
    groups,
    isLoadingMovements,
    errorMessage,
    spending,
    habits,
    pixRecipients,
    pixSearchInput,
    setPixSearchInput,
    openRecipient,
    openRecipientSheet,
    closeRecipientSheet,
    recipientTransactions,
    isLoadingRecipientTransactions,
  } = useBenefitPage()

  return (
    <main className="min-h-screen bg-surface pb-28 md:pb-10">
      <div className="mx-auto flex max-w-[420px] flex-col gap-4 px-4 pt-8">
        <div className="flex">
          <CardStatementSwitch active="statement" onSurface />
        </div>

        <div className="flex items-center gap-3">
          <IconButton href="/movements" aria-label="Voltar ao extrato">
            <BackIcon />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="display-number truncate text-[2rem] text-ink">Benefício</h1>
            {benefitAccount && <p className="truncate text-sm text-muted">{benefitAccount.name}</p>}
          </div>
        </div>

        {!isLoadingAccounts && !benefitAccount && (
          <p className="text-text">
            Nenhuma conta marcada como benefício. Marque uma conta corrente em Contas (menu ⋯ da conta).
          </p>
        )}

        {benefitAccount && (
          <>
            <div className="rounded-card-lg bg-inverse px-5 py-5 text-on-inverse">
              <p className="text-xs text-on-inverse-muted">Saldo de benefício</p>
              <p className="display-number mt-2 text-[2.5rem] text-on-inverse-accent">
                <MoneyText
                  cents={report?.balanceCents ?? benefitAccount.balanceCents ?? 0}
                  className="!text-on-inverse-accent"
                />
              </p>
              {report?.pace && (
                <p className="mt-2 text-sm text-on-inverse-muted">
                  Dá <MoneyText cents={report.pace.perDayCents} className="!text-on-inverse" /> por dia{' '}
                  {report.pace.daysRemaining === 1
                    ? 'no dia que falta pro próximo depósito'
                    : `nos ${report.pace.daysRemaining} dias até o próximo depósito`}
                </p>
              )}
              {(report?.lastSyncAt ?? benefitAccount.lastSyncAt) && (
                <p className="mt-1 text-xs text-on-inverse-muted">
                  Atualizado {formatSyncedAt((report?.lastSyncAt ?? benefitAccount.lastSyncAt) as string)}
                </p>
              )}
            </div>

            <SegmentedControl label="Visão" options={TAB_OPTIONS} value={tab} onChange={setTab} />
            <MonthStepper
              label={`${formatMonthName(month)} ${month.slice(0, 4)}`}
              onPrevious={goToPreviousMonth}
              onNext={goToNextMonth}
              fullWidth
            />

            {report && (
              <StatementSummary totals={{ incomeCents: report.incomeCents, expenseCents: report.expenseCents }} />
            )}
          </>
        )}
      </div>

      {benefitAccount && (
        <div className="mx-auto mt-5 max-w-[420px] rounded-t-[28px] bg-canvas px-4 pb-6 pt-4 md:rounded-[28px]">
          {errorMessage && <InlineAlert>{errorMessage}</InlineAlert>}

          {tab === 'statement' && (
            <>
              {isLoadingMovements && <p className="text-text">Carregando…</p>}
              {!isLoadingMovements && !errorMessage && groups.length === 0 && (
                <p className="text-text">Nenhuma movimentação neste mês.</p>
              )}
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="pb-0.5 pt-3.5 text-sm font-semibold text-muted">{group.label}</p>
                  {group.items.map((movement) => (
                    <MovementRow key={movement.id} movement={movement} accountName={benefitAccount.name} />
                  ))}
                </div>
              ))}
            </>
          )}

          {tab === 'summary' && report && (
            <div className="flex flex-col gap-7">
              <p className="text-sm text-muted">
                Resultado do mês: <MoneyText cents={report.resultCents} className="!text-sm" />. Só consulta, não entra
                no orçamento.
              </p>
              <DailyExpenseChart daily={report.daily} />
              <SpendingSection spending={spending} />
              <HabitsSection habits={habits} />
              <PixRecipientsSection
                data={pixRecipients}
                search={pixSearchInput}
                onSearchChange={setPixSearchInput}
                onOpenRecipient={openRecipientSheet}
              />
            </div>
          )}
        </div>
      )}

      {openRecipient && benefitAccount && (
        <PixRecipientSheet
          name={openRecipient.name}
          transactions={recipientTransactions}
          isLoading={isLoadingRecipientTransactions}
          accountName={benefitAccount.name}
          onClose={closeRecipientSheet}
        />
      )}
    </main>
  )
}
