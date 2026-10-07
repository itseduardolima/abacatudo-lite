'use client'

import { Suspense } from 'react'
import type { Segment } from './use-transactions-page'
import { StatementsSheet } from './statements-sheet'
import { TransactionSheet } from './transaction-sheet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { MonthStepper } from '@/components/ui/MonthStepper'
import { BankAvatar } from '@/components/finance/BankAvatar'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatAccountType } from '@/lib/utils/format-account-type'
import { formatMonthName } from '@/lib/utils/format-month'
import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'
import { useStatementsSheet } from './use-statements-sheet'
import { useTransactionsPage } from './use-transactions-page'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { HeroSkeleton } from '../home-skeleton'

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'mine', label: 'Meu' },
  { value: 'notMine', label: 'Não é meu' },
]

// Layout segue o protótipo (08-fatura): card escuro com o número grande, barra de progresso e a
// quebra "Fatura do banco / − Não é meu / = Meu". Sem a terceira faixa "A classificar" do protótipo nem
// o chip "Sem dono" como estado pendente — decisão já tomada (TODO.md "Toda transação nasce Meu"): não
// existe fila de classificação, só Meu e Não é meu (Fatura = Meu + Não é meu).
// useSearchParams exige Suspense (Next.js) — sem isso o build falha.
export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  )
}

function TransactionsContent() {
  const {
    isLoading,
    cardAccounts,
    selectedAccountId,
    setSelectedAccountId,
    invoice,
    forecast,
    segment,
    setSegment,
    groups,
    categories,
    people,
    editingId,
    editingTx,
    sheetView,
    setSheetView,
    nameDraft,
    setNameDraft,
    nameError,
    isSavingName,
    openNameEdit,
    saveDisplayName,
    openEdit,
    closeEdit,
    alwaysForMerchant,
    setAlwaysForMerchant,
    selectCategory,
    selectPerson,
    acceptSuggestedCategory,
    isSaving,
    setCancelled,
    isCancelling,
    ruleError,
    openSplit,
    splitPersonIds,
    toggleSplitPerson,
    splitMode,
    setSplitMode,
    splitAmounts,
    setSplitAmount,
    saveSplit,
    removeSplit,
    isSavingSplit,
    isPreviewingSplit,
  } = useTransactionsPage()

  const selectedAccount = cardAccounts.find((account) => account.id === selectedAccountId)
  const statementsSheet = useStatementsSheet(forecast.isForecast ? forecast.month : undefined)

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-4 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        {selectedAccount ? (
          <>
            <BankAvatar
              bankLogo={selectedAccount.bankLogo}
              fallbackInitial={selectedAccount.name.charAt(0).toUpperCase()}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold text-ink">{selectedAccount.name}</p>
              <p className="text-sm text-muted">{formatAccountType(selectedAccount.type)}</p>
            </div>
          </>
        ) : (
          <h1 className="display-number text-[2rem] text-ink">Fatura</h1>
        )}
      </div>

      {isLoading && (
        <>
          <HeroSkeleton />
          <ListSkeleton rows={5} />
        </>
      )}

      {!isLoading && cardAccounts.length === 0 && (
        <p className="text-text">Nenhum cartão de crédito ainda. Crie um em Contas.</p>
      )}

      {cardAccounts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cardAccounts.map((account) => (
            <Button
              key={account.id}
              size="sm"
              variant={selectedAccountId === account.id ? 'primary' : 'outline'}
              onClick={() => setSelectedAccountId(account.id)}
            >
              {account.name}
            </Button>
          ))}
        </div>
      )}

      {selectedAccount && (
        <MonthStepper
          label={formatMonthName(forecast.month)}
          onPrevious={forecast.goToPreviousMonth}
          onNext={forecast.goToNextMonth}
          canGoPrevious={forecast.canGoPrevious}
          canGoNext={forecast.canGoNext}
          fullWidth
        />
      )}

      {selectedAccount && forecast.isForecast && (
        <p className="text-xs text-muted">Previsão: parcelas lançadas pelo banco e estimadas para este mês.</p>
      )}

      {selectedAccount && invoice && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-pill bg-tint px-3 py-1 text-xs font-medium text-primary-ink">
              {forecast.isForecast ? 'Fatura prevista' : 'Fatura aberta'} de {formatMonthName(forecast.month)}
            </span>
            {(selectedAccount.closingDay || selectedAccount.dueDay) && (
              <span className="text-xs text-muted">
                {selectedAccount.closingDay && `Fecha dia ${selectedAccount.closingDay}`}
                {selectedAccount.closingDay && selectedAccount.dueDay && ', '}
                {selectedAccount.dueDay && `vence dia ${selectedAccount.dueDay}`}
              </span>
            )}
          </div>

          <div className="rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
            <p className="text-xs text-on-inverse-muted">
              {forecast.isForecast ? 'Meu previsto nesta fatura' : 'Meu nesta fatura'}
            </p>
            <p className="display-number mt-2.5 text-[3.25rem] text-on-inverse-accent">
              <MoneyText cents={invoice.mineCents} className="!text-on-inverse-accent" />
            </p>
            <div className="mt-5 h-3.5 overflow-hidden rounded-pill bg-on-inverse-hairline">
              <div
                className="h-full rounded-pill bg-on-inverse-accent"
                style={{ width: `${invoice.totalCents > 0 ? (invoice.mineCents / invoice.totalCents) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-4 overflow-hidden rounded-card bg-canvas text-text">
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>Fatura do banco</span>
                <MoneyText cents={invoice.totalCents} />
              </div>
              <div className="flex items-center justify-between border-t border-surface px-4 py-2.5 text-sm text-muted">
                <span>− Não é meu</span>
                <MoneyText cents={invoice.notMineCents} />
              </div>
              <div className="flex items-center justify-between bg-tint px-4 py-2.5 text-sm font-bold text-primary-ink">
                <span>= Meu</span>
                <MoneyText cents={invoice.mineCents} />
              </div>
            </div>
          </div>
          {invoice.advancePaidCents > 0 && (
            <p className="text-xs text-muted">
              Já abatido <MoneyText cents={invoice.advancePaidCents} className="!text-xs" /> de pagamento adiantado.
            </p>
          )}
          <Button variant="outline" onClick={statementsSheet.open}>
            Enviar contas
          </Button>
        </>
      )}

      {selectedAccount && (
        <div className="inline-flex gap-1 self-start rounded-pill bg-surface p-1">
          {SEGMENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSegment(option.value)}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
                segment === option.value ? 'bg-primary text-primary-ink' : 'text-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {selectedAccount && groups.length === 0 && !isLoading && (
        <p className="text-text">
          {forecast.isForecast ? 'Nenhuma parcela prevista neste mês.' : 'Nenhum lançamento neste mês.'}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <p className="pb-0.5 pt-3.5 text-sm font-semibold text-muted">{group.label}</p>
          {group.items.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => openEdit(tx.id)}
              className={`flex w-full items-center justify-between gap-3 border-b border-surface py-3 text-left last:border-b-0 ${
                tx.cancelledAt ? 'opacity-60' : ''
              }`}
            >
              <div className="min-w-0">
                <p className={`truncate font-semibold text-ink ${tx.cancelledAt ? 'line-through' : ''}`}>
                  {tx.displayName ?? tx.merchant ?? tx.description}
                </p>
                {tx.cancelledAt && (
                  <div className="mt-1">
                    <Badge>Cancelada</Badge>
                  </div>
                )}
                {tx.kind !== 'CARD_PAYMENT' &&
                !tx.categoryName &&
                tx.categorySuggestedName &&
                tx.categorySuggestedId ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      const categorySuggestedId = tx.categorySuggestedId
                      if (categorySuggestedId) void acceptSuggestedCategory(tx.id, categorySuggestedId)
                    }}
                    className="mt-1 inline-flex items-center gap-1 rounded-pill bg-tint px-2 py-0.5 text-xs font-medium text-primary-ink"
                  >
                    Sugestão: {tx.categorySuggestedName} · toque para aceitar
                  </span>
                ) : (
                  <p className="mt-0.5 text-sm text-muted">
                    {tx.kind === 'CARD_PAYMENT' ? 'Pagamento da fatura' : (tx.categoryName ?? 'Sem categoria')}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {tx.kind === 'CARD_PAYMENT' ? (
                  <span className="rounded-pill bg-tint px-2.5 py-1">
                    <MoneyText cents={-tx.amountCents} className="!text-primary-ink" />
                  </span>
                ) : (
                  <>
                    <MoneyText
                      cents={tx.kind === 'REFUND' ? -tx.amountCents : tx.amountCents}
                      className={tx.cancelledAt ? 'line-through' : undefined}
                    />
                    {/* "Eu" é o padrão (03-regras-negocio § Atribuição de pessoa: toda transação nasce
                    Meu) — mostrar o avatar nesse caso só repetia informação óbvia em toda linha; só vale
                    a pena chamar atenção quando é de outra pessoa. */}
                    {tx.personName && !tx.personIsSelf ? (
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${personAvatarClass(
                          tx.personIsSelf,
                          tx.personOthersIndex,
                        )}`}
                      >
                        {personInitial(tx.personName)}
                      </span>
                    ) : tx.isSplit ? (
                      <span className="rounded-pill bg-tint px-2.5 py-1 text-xs font-medium text-primary-ink">
                        Dividido
                      </span>
                    ) : !tx.personName ? (
                      <span className="rounded-pill px-2.5 py-1 text-xs text-muted shadow-hair">Sem dono</span>
                    ) : null}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      ))}

      {statementsSheet.isOpen && (
        <StatementsSheet
          statements={statementsSheet.statements}
          isLoading={statementsSheet.isLoading}
          isError={statementsSheet.isError}
          isForecast={statementsSheet.isForecast}
          copiedPersonId={statementsSheet.copiedPersonId}
          isTooLongForLink={statementsSheet.isTooLongForLink}
          onSend={statementsSheet.send}
          onCopy={statementsSheet.copy}
          onClose={statementsSheet.close}
        />
      )}

      {editingId && editingTx && selectedAccount && (
        <TransactionSheet
          tx={editingTx}
          accountName={selectedAccount.name}
          view={sheetView}
          setView={setSheetView}
          categories={categories}
          people={people}
          isSaving={isSaving}
          setCancelled={(id, cancelled) => void setCancelled(id, cancelled)}
          isCancelling={isCancelling}
          ruleError={ruleError}
          nameDraft={nameDraft}
          setNameDraft={setNameDraft}
          nameError={nameError}
          isSavingName={isSavingName}
          openNameEdit={openNameEdit}
          saveDisplayName={saveDisplayName}
          alwaysForMerchant={alwaysForMerchant}
          setAlwaysForMerchant={setAlwaysForMerchant}
          selectCategory={(id, categoryId) => void selectCategory(id, categoryId)}
          selectPerson={(id, personId) => void selectPerson(id, personId)}
          onClose={closeEdit}
          openSplit={openSplit}
          splitPersonIds={splitPersonIds}
          toggleSplitPerson={toggleSplitPerson}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          splitAmounts={splitAmounts}
          setSplitAmount={setSplitAmount}
          saveSplit={() => void saveSplit()}
          removeSplit={() => void removeSplit()}
          isSavingSplit={isSavingSplit}
          isPreviewingSplit={isPreviewingSplit}
        />
      )}
    </main>
  )
}
