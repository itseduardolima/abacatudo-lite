'use client'

import type { Category, Person, TransactionKind } from '@gastos/shared'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatDateTimeLong } from '@/lib/utils/format-date'
import { formatMoney, maskMoneyInput, parseMoneyInput } from '@/lib/utils/format-money'
import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'
import type { SheetView, SplitMode } from './use-transactions-page'

export interface SheetTransaction {
  id: string
  kind: TransactionKind
  amountCents: number
  occurredAt: string
  description: string
  merchant: string | null
  displayName: string | null
  cancelledAt: string | null
  categoryId: string | null
  personId: string | null
  cardLast4: string | null
  installmentNumber: number | null
  installmentTotal: number | null
  categoryName: string | null
  personName: string | null
  personIsSelf: boolean
  personOthersIndex: number
  splits: { personId: string; amountCents: number }[]
}

interface TransactionSheetProps {
  tx: SheetTransaction
  accountName: string
  view: SheetView
  setView: (view: SheetView) => void
  categories: Category[]
  people: Person[]
  isSaving: boolean
  setCancelled: (transactionId: string, cancelled: boolean) => void
  isCancelling: boolean
  ruleError: string | null
  nameDraft: string
  setNameDraft: (value: string) => void
  nameError: string | null
  isSavingName: boolean
  openNameEdit: (currentName: string) => void
  saveDisplayName: (displayName: string | null) => void
  alwaysForMerchant: boolean
  setAlwaysForMerchant: (value: boolean) => void
  selectCategory: (transactionId: string, categoryId: string) => void
  selectPerson: (transactionId: string, personId: string) => void
  onClose: () => void
  openSplit: () => void
  splitPersonIds: string[]
  toggleSplitPerson: (personId: string) => void
  splitMode: SplitMode
  setSplitMode: (mode: SplitMode) => void
  splitAmounts: Record<string, string>
  setSplitAmount: (personId: string, value: string) => void
  saveSplit: () => void
  removeSplit: () => void
  isSavingSplit: boolean
  isPreviewingSplit: boolean
}

// Mesmo padrão de bottom sheet do protótipo (12-detalhe: véu escuro + folha com puxador) — trocado pelo
// acordeão inline que existia antes (a pedido do usuário: "tem que aparecer uma tela igual a do
// protótipo"). `view` alterna entre o detalhe e os seletores (10-classificar-escolha, 11-dividir), sempre
// dentro da mesma folha — escolher não fecha, volta pro detalhe (protótipo faz o mesmo).
export function TransactionSheet({
  tx,
  accountName,
  view,
  setView,
  categories,
  people,
  isSaving,
  setCancelled,
  isCancelling,
  ruleError,
  nameDraft,
  setNameDraft,
  nameError,
  isSavingName,
  openNameEdit,
  saveDisplayName,
  alwaysForMerchant,
  setAlwaysForMerchant,
  selectCategory,
  selectPerson,
  onClose,
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
}: TransactionSheetProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const remainingInstallments =
    tx.installmentNumber != null && tx.installmentTotal != null ? tx.installmentTotal - tx.installmentNumber : 0
  const isSplit = tx.splits.length > 0
  const canSplit = tx.kind === 'EXPENSE' || tx.kind === 'REFUND'
  const isCancelled = tx.cancelledAt !== null
  const canCancel = canSplit

  const splitSumCents = splitPersonIds.reduce(
    (total, personId) => total + (parseMoneyInput(splitAmounts[personId] ?? '0') || 0),
    0,
  )
  const splitMissingCents = tx.amountCents - splitSumCents

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div
        className="absolute inset-x-2 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />

        {view === 'detail' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate text-xl font-bold text-ink ${isCancelled ? 'line-through' : ''}`}>
                  {tx.displayName ?? tx.merchant ?? tx.description}
                </p>
                {isCancelled && (
                  <div className="mt-1">
                    <Badge>Cancelada</Badge>
                  </div>
                )}
                {(tx.displayName || tx.merchant) && (
                  <p className="mt-0.5 truncate text-xs text-muted">{tx.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <p
              className={`display-number text-[2.75rem] ${tx.kind === 'CARD_PAYMENT' ? 'text-primary-ink' : 'text-ink'} ${isCancelled ? 'line-through' : ''}`}
            >
              <MoneyText
                cents={tx.kind === 'CARD_PAYMENT' || tx.kind === 'REFUND' ? -tx.amountCents : tx.amountCents}
                className={tx.kind === 'CARD_PAYMENT' ? '!text-primary-ink' : undefined}
              />
            </p>

            <div>
              <div className="flex items-center justify-between border-b border-surface py-3 text-sm">
                <span className="text-muted">Data</span>
                <span className="font-medium text-ink">{formatDateTimeLong(tx.occurredAt)}</span>
              </div>
              <div
                className={`flex items-center justify-between py-3 text-sm ${
                  tx.kind === 'CARD_PAYMENT' && !tx.installmentTotal ? '' : 'border-b border-surface'
                }`}
              >
                <span className="text-muted">Cartão</span>
                <span className="font-medium text-ink">
                  {accountName}
                  {tx.cardLast4 ? ` final ${tx.cardLast4}` : ''}
                </span>
              </div>
              {tx.installmentTotal && (
                <div className="flex items-center justify-between border-b border-surface py-3 text-sm">
                  <span className="text-muted">Parcela</span>
                  <span className="font-medium text-ink">
                    {tx.installmentNumber} de {tx.installmentTotal}
                  </span>
                </div>
              )}
              {/* Pagamento de fatura nunca é gasto (03-regras-negocio § Movimentações) — atribuir categoria
              ou "quem gastou" a essa linha não faz sentido, então nem oferece. */}
              {tx.kind !== 'CARD_PAYMENT' && (
                <>
                  <button
                    type="button"
                    onClick={() => setView('person')}
                    className="flex w-full items-center justify-between border-b border-surface py-3 text-sm"
                  >
                    <span className="text-muted">Quem gastou</span>
                    {isSplit ? (
                      <span className="font-medium text-ink">Dividido entre {tx.splits.length}</span>
                    ) : tx.personName ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${personAvatarClass(
                            tx.personIsSelf,
                            tx.personOthersIndex,
                          )}`}
                        >
                          {personInitial(tx.personName)}
                        </span>
                        <span className="font-medium text-ink">{tx.personName}</span>
                      </span>
                    ) : (
                      <span className="font-medium text-muted">Sem dono</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openNameEdit(tx.displayName ?? tx.merchant ?? tx.description)}
                    className="flex w-full items-center justify-between border-b border-surface py-3 text-sm"
                  >
                    <span className="text-muted">Nome na fatura</span>
                    <span className="flex items-center gap-1 font-medium text-ink">
                      {tx.displayName ?? 'Nome do banco'}
                      <ChevronRight size={16} strokeWidth={1.8} className="text-muted" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('category')}
                    className="flex w-full items-center justify-between py-3 text-sm"
                  >
                    <span className="text-muted">Categoria</span>
                    <span className="flex items-center gap-1 font-medium text-ink">
                      {tx.categoryName ?? 'Sem categoria'}
                      <ChevronRight size={16} strokeWidth={1.8} className="text-muted" />
                    </span>
                  </button>
                </>
              )}
            </div>

            {remainingInstallments > 0 && (
              <div className="flex items-start gap-2.5 rounded-card bg-tint px-3.5 py-3 text-sm text-primary-ink">
                <span>
                  Restam {remainingInstallments} parcela{remainingInstallments > 1 ? 's' : ''} de{' '}
                  {formatMoney(tx.amountCents)}, {formatMoney(tx.amountCents * remainingInstallments)} nos próximos
                  meses. Elas ficam fora do mês atual.
                </span>
              </div>
            )}

            {canCancel && (
              <div className="flex flex-col gap-2">
                {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
                {!isCancelled && tx.installmentTotal != null && tx.installmentNumber != null && (
                  <p className="text-xs text-muted">
                    Cancelar tira todas as parcelas ainda não faturadas dessa compra da fatura, do orçamento e dos
                    relatórios.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  state={isCancelling ? 'loading' : 'idle'}
                  onClick={() => setCancelled(tx.id, !isCancelled)}
                >
                  {isCancelled ? 'Reativar compra' : 'Cancelar compra'}
                </Button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button onClick={onClose} className="flex-1">
                Concluído
              </Button>
              {canSplit && (
                <Button type="button" variant="link" onClick={openSplit}>
                  {isSplit ? 'Editar divisão' : 'Dividir compra'}
                </Button>
              )}
            </div>
          </div>
        )}

        {(view === 'category' || view === 'person') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('detail')}
                aria-label="Voltar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <ChevronLeft size={18} strokeWidth={1.8} />
              </button>
              <p className="text-lg font-bold text-ink">{view === 'category' ? 'Categoria' : 'Quem gastou'}</p>
            </div>

            {ruleError && <InlineAlert>{ruleError}</InlineAlert>}

            <div className="flex flex-wrap gap-2">
              {view === 'category'
                ? categories.map((category) => (
                    <Button
                      key={category.id}
                      size="sm"
                      variant={tx.categoryId === category.id ? 'primary' : 'outline'}
                      state={isSaving ? 'loading' : 'idle'}
                      onClick={() => selectCategory(tx.id, category.id)}
                    >
                      {category.name}
                    </Button>
                  ))
                : people.map((person) => (
                    <Button
                      key={person.id}
                      size="sm"
                      variant={tx.personId === person.id && !isSplit ? 'primary' : 'outline'}
                      state={isSaving ? 'loading' : 'idle'}
                      onClick={() => selectPerson(tx.id, person.id)}
                    >
                      {person.name}
                    </Button>
                  ))}
            </div>

            {tx.merchant && (
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={alwaysForMerchant}
                  onChange={(event) => setAlwaysForMerchant(event.target.checked)}
                />
                Sempre que for &quot;{tx.merchant}&quot;
              </label>
            )}
          </div>
        )}

        {view === 'name' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              saveDisplayName(nameDraft)
            }}
            noValidate
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('detail')}
                aria-label="Voltar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <ChevronLeft size={18} strokeWidth={1.8} />
              </button>
              <p className="text-lg font-bold text-ink">Nome na fatura</p>
            </div>
            <p className="text-sm text-muted">
              Aparece no texto da conta que você envia. Vale para todas as parcelas dessa compra.
            </p>
            <Input
              label="Nome"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              error={nameError ?? undefined}
              autoFocus
            />
            <div className="flex items-center gap-3">
              <Button type="submit" state={isSavingName ? 'loading' : 'idle'}>
                Salvar
              </Button>
              {tx.displayName && (
                <Button type="button" variant="link" onClick={() => saveDisplayName(null)}>
                  Usar o nome do banco
                </Button>
              )}
            </div>
          </form>
        )}

        {view === 'split' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-ink">Dividir compra</p>
                <p className="text-sm text-muted">
                  {tx.merchant ?? tx.description}, {formatMoney(tx.amountCents)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('detail')}
                aria-label="Voltar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            {ruleError && <InlineAlert>{ruleError}</InlineAlert>}

            <div className="inline-flex gap-1 self-start rounded-pill bg-surface p-1">
              {(['equal', 'byValue'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
                    splitMode === mode ? 'bg-primary text-primary-ink' : 'text-text'
                  }`}
                >
                  {mode === 'equal' ? 'Igualmente' : 'Por valor'}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-text">Quem entra</p>
            <div className="flex flex-wrap gap-2">
              {people.map((person) => (
                <Button
                  key={person.id}
                  type="button"
                  size="sm"
                  variant={splitPersonIds.includes(person.id) ? 'primary' : 'outline'}
                  onClick={() => toggleSplitPerson(person.id)}
                >
                  {person.name}
                </Button>
              ))}
            </div>

            {splitPersonIds.length > 0 && (
              <div className="flex flex-col gap-3">
                {splitPersonIds.map((personId) => {
                  const person = people.find((p) => p.id === personId)
                  if (!person) return null
                  return (
                    <div key={personId} className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${personAvatarClass(
                          person.isSelf,
                          people.filter((p) => !p.isSelf).findIndex((p) => p.id === personId),
                        )}`}
                      >
                        {personInitial(person.name)}
                      </span>
                      <span className="flex-1 font-semibold text-ink">{person.name}</span>
                      <input
                        aria-label={`Valor de ${person.name}`}
                        inputMode="decimal"
                        placeholder="0,00"
                        readOnly={splitMode === 'equal'}
                        value={splitAmounts[personId] ?? ''}
                        onChange={(event) => setSplitAmount(personId, maskMoneyInput(event.target.value))}
                        className="h-11 w-28 rounded-card border border-border bg-canvas px-3 text-right text-base tabular-nums text-ink focus:border-border-strong focus:outline-none read-only:bg-surface"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {splitPersonIds.length >= 2 && (
              <div
                className={`flex items-start gap-2.5 rounded-card px-3.5 py-3 text-sm ${
                  splitMissingCents === 0 ? 'bg-tint text-primary-ink' : 'bg-surface text-text'
                }`}
              >
                {splitMissingCents === 0 && <Check size={18} strokeWidth={2.4} className="mt-0.5 flex-shrink-0" />}
                <span>
                  A soma fecha em {formatMoney(splitSumCents)}. Falta {formatMoney(Math.abs(splitMissingCents))}.
                </span>
              </div>
            )}

            <Button
              onClick={saveSplit}
              state={isSavingSplit || isPreviewingSplit ? 'loading' : 'idle'}
              disabled={splitPersonIds.length < 2 || splitMissingCents !== 0}
            >
              Salvar divisão
            </Button>

            {isSplit && (
              <Button type="button" variant="link" onClick={removeSplit} state={isSavingSplit ? 'loading' : 'idle'}>
                Remover divisão
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
