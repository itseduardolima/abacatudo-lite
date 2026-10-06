'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useEstimatedInstallments } from '@/hooks/queries/use-estimated-installments'
import { useForecastMonth } from '@/hooks/use-forecast-month'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useCategories } from '@/hooks/queries/use-categories'
import { useClearSplit } from '@/hooks/queries/use-clear-split'
import { useInvoice, useInvoices } from '@/hooks/queries/use-invoice'
import { usePeople } from '@/hooks/queries/use-people'
import { usePreviewSplit } from '@/hooks/queries/use-preview-split'
import { useReplaceSplit } from '@/hooks/queries/use-replace-split'
import { useSuggestCategories } from '@/hooks/queries/use-suggest-categories'
import { useTransactions } from '@/hooks/queries/use-transactions'
import { useUpdateTransactionDisplayName } from '@/hooks/queries/use-update-transaction-display-name'
import { useUpdateTransactionCategory } from '@/hooks/queries/use-update-transaction-category'
import { useUpdateTransactionPerson } from '@/hooks/queries/use-update-transaction-person'
import { ApiClientError } from '@/lib/api-client'
import { latestForecastMonth } from '@/lib/utils/latest-forecast-month'
import { dayGroupLabel } from '@/lib/utils/format-day-group'
import { formatMoney, parseMoneyInput } from '@/lib/utils/format-money'

// "R$ X,XX" -> "X,XX", pra pré-preencher o campo com o mesmo formato que parseMoneyInput espera de
// volta (vírgula decimal) — nunca o "X.XX" de um `String(centavos / 100)` cru, que parseMoneyInput leria
// errado (trataria o ponto como separador de milhar).
function centsToInputValue(cents: number): string {
  return formatMoney(cents).replace('R$ ', '')
}

export type Segment = 'all' | 'mine' | 'notMine'
export type SheetView = 'detail' | 'category' | 'person' | 'split' | 'name'
export type SplitMode = 'equal' | 'byValue'

// Hook de página: só orquestração (04-padroes-codigo). Fatura é por cartão (protótipo 08-fatura) — a
// API de transações não filtra por conta, então o filtro por `accountId` é feito aqui; a de convite
// (GET /invoice) já é por conta. categoryId/personId da transação viram nome/pessoa aqui — a API não
// embute a relação.
export function useTransactionsPage() {
  const accounts = useAccounts()
  const categories = useCategories()
  const people = usePeople()
  const updateCategory = useUpdateTransactionCategory()
  const updatePerson = useUpdateTransactionPerson()
  const updateDisplayName = useUpdateTransactionDisplayName()
  const previewSplit = usePreviewSplit()
  const replaceSplit = useReplaceSplit()
  const clearSplit = useClearSplit()
  const suggestCategories = useSuggestCategories()

  const suggestCategoriesFired = useRef(false)
  useEffect(() => {
    if (suggestCategoriesFired.current) return
    suggestCategoriesFired.current = true
    suggestCategories.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara uma vez por sessão de página
  }, [])

  const cardAccounts = (accounts.data ?? []).filter((a) => a.type === 'CREDIT_CARD' && !a.archivedAt)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!selectedAccountId && cardAccounts[0]) setSelectedAccountId(cardAccounts[0].id)
  }, [cardAccounts, selectedAccountId])

  const currentInvoices = useInvoices(cardAccounts.map((account) => account.id))
  const forecast = useForecastMonth(
    latestForecastMonth(currentInvoices.map((query) => query.data?.lastForecastMonth)),
    useSearchParams().get('month'),
  )
  const forecastMonth = forecast.isForecast ? forecast.month : undefined
  const invoice = useInvoice(selectedAccountId, forecastMonth)
  const transactions = useTransactions(forecastMonth)
  const estimatedInstallments = useEstimatedInstallments(selectedAccountId, forecast.month)
  const [segment, setSegment] = useState<Segment>('all')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetView, setSheetView] = useState<SheetView>('detail')
  const [alwaysForMerchant, setAlwaysForMerchant] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const submissionRef = useRef(0)

  // Estado da divisão (11-dividir): "Igualmente" recalcula sempre que a lista de pessoas muda (preview,
  // nunca grava sozinho); "Por valor" deixa o usuário digitar, o preview só serve pra chutar o ponto de
  // partida. Dinheiro nunca é calculado aqui de verdade (04-padroes-codigo) — a soma "igual" vem sempre do
  // preview da API; o replace final é sempre validado pelo backend (a soma tem que fechar).
  const [splitPersonIds, setSplitPersonIds] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({})

  const categoryNameById = new Map((categories.data ?? []).map((category) => [category.id, category.name]))
  const selfPersonId = (people.data ?? []).find((person) => person.isSelf)?.id
  const othersOrder = (people.data ?? []).filter((person) => !person.isSelf).map((person) => person.id)

  const cardTransactions = (transactions.data ?? []).filter((tx) => tx.accountId === selectedAccountId)
  const filtered = cardTransactions.filter((tx) => {
    if (segment === 'all') return true
    const isMine = tx.personId === selfPersonId || tx.personId === null
    return segment === 'mine' ? isMine : !isMine
  })

  const rows = filtered
    .map((tx) => {
      const person = (people.data ?? []).find((p) => p.id === tx.personId)
      return {
        ...tx,
        categoryName: tx.categoryId ? (categoryNameById.get(tx.categoryId) ?? null) : null,
        categorySuggestedName: tx.categorySuggestedId ? (categoryNameById.get(tx.categorySuggestedId) ?? null) : null,
        personName: person?.name ?? null,
        personIsSelf: person?.isSelf ?? false,
        personOthersIndex: person ? othersOrder.indexOf(person.id) : -1,
        // Dividida: `personId` fica null (mesmo sinal que "nunca atribuído"), mas aqui já tem dono — mais
        // de uma pessoa. Não é "Sem dono" (03-regras-negocio § Atribuição de pessoa: toda transação nasce
        // Meu, então null sem split ainda significa Eu, não "sem dono" de verdade).
        isSplit: tx.splits.length > 0,
        dayLabel: dayGroupLabel(forecast.isForecast ? (tx.installmentDueAt ?? tx.occurredAt) : tx.occurredAt),
        sortAt: forecast.isForecast ? (tx.installmentDueAt ?? tx.occurredAt) : tx.occurredAt,
      }
    })
    .sort((a, b) => b.sortAt.localeCompare(a.sortAt))

  const groups: { label: string; items: typeof rows }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.label === row.dayLabel) last.items.push(row)
    else groups.push({ label: row.dayLabel, items: [row] })
  }

  const openEdit = (id: string) => {
    submissionRef.current++
    setEditingId(id)
    setSheetView('detail')
    setAlwaysForMerchant(false)
    setRuleError(null)
  }

  const openNameEdit = (currentName: string) => {
    setNameDraft(currentName)
    setNameError(null)
    setSheetView('name')
  }

  const saveDisplayName = async (displayName: string | null) => {
    if (!editingId) return
    setNameError(null)
    try {
      await updateDisplayName.mutateAsync({ id: editingId, displayName })
      setSheetView('detail')
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        setNameError('Não foi possível salvar o nome agora.')
        return
      }
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      setNameError(fieldErrors?.displayName?.[0] ?? error.error.message)
    }
  }

  const closeEdit = () => {
    submissionRef.current++
    setEditingId(null)
    setSheetView('detail')
    setAlwaysForMerchant(false)
    setRuleError(null)
  }

  // Escolher categoria/pessoa volta pro detalhe (nunca fecha a folha) — o usuário vê o resultado antes de
  // decidir fechar, mesmo padrão do protótipo (10-classificar-escolha volta pro 12-detalhe depois de
  // escolher).
  const runUpdate = async (mutate: () => Promise<unknown>) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      await mutate()
      if (submission !== submissionRef.current) return
      setSheetView('detail')
      setAlwaysForMerchant(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return
      setRuleError(error.error.message)
    }
  }

  const selectCategory = (transactionId: string, categoryId: string) =>
    runUpdate(() => updateCategory.mutateAsync({ id: transactionId, input: { categoryId, alwaysForMerchant } }))

  const acceptSuggestedCategory = (transactionId: string, categoryId: string) =>
    runUpdate(() => updateCategory.mutateAsync({ id: transactionId, input: { categoryId, alwaysForMerchant: false } }))

  const selectPerson = (transactionId: string, personId: string) =>
    runUpdate(() =>
      updatePerson.mutateAsync({ id: transactionId, input: { personId, alwaysForMerchant, alwaysForCard: false } }),
    )

  const editingTx = editingId ? (rows.find((row) => row.id === editingId) ?? null) : null

  // Abre a divisão já com quem já estava dividido (ou só "Eu" + a pessoa atual, pra começar de algo)
  // marcado — nunca começa vazio.
  const openSplit = () => {
    if (!editingTx) return
    const existingIds = editingTx.splits.map((split) => split.personId)
    const startIds =
      existingIds.length >= 2
        ? existingIds
        : [...new Set([selfPersonId, editingTx.personId ?? selfPersonId].filter((id): id is string => Boolean(id)))]
    setSplitPersonIds(startIds)
    setSplitAmounts(
      Object.fromEntries(editingTx.splits.map((split) => [split.personId, centsToInputValue(split.amountCents)])),
    )
    setSplitMode('equal')
    setRuleError(null)
    setSheetView('split')
  }

  const toggleSplitPerson = (personId: string) => {
    setSplitPersonIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    )
  }

  // Recalcula "Igualmente" toda vez que a lista de pessoas muda — nunca inventa o valor aqui, só pede pra
  // API (splitEqually é sempre backend).
  useEffect(() => {
    if (sheetView !== 'split' || splitMode !== 'equal' || !editingId || splitPersonIds.length < 2) return
    previewSplit.mutate(
      { id: editingId, personIds: splitPersonIds },
      {
        onSuccess: (preview) => {
          setSplitAmounts(Object.fromEntries(preview.splits.map((s) => [s.personId, centsToInputValue(s.amountCents)])))
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previewSplit é estável o bastante (mutate), incluir quebraria o loop
  }, [sheetView, splitMode, editingId, splitPersonIds.join(',')])

  const saveSplit = async () => {
    if (!editingId) return
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      const splits = splitPersonIds.map((personId) => ({
        personId,
        amountCents: parseMoneyInput(splitAmounts[personId] ?? '0'),
      }))
      await replaceSplit.mutateAsync({ id: editingId, input: { splits } })
      if (submission !== submissionRef.current) return
      setSheetView('detail')
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return
      setRuleError(error.error.message)
    }
  }

  const removeSplit = async () => {
    if (!editingId) return
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      await clearSplit.mutateAsync(editingId)
      if (submission !== submissionRef.current) return
      setSheetView('detail')
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return
      setRuleError(error.error.message)
    }
  }

  return {
    isLoading: accounts.isPending || categories.isPending || people.isPending || transactions.isPending,
    cardAccounts,
    selectedAccountId,
    setSelectedAccountId,
    invoice: invoice.data,
    estimatedInstallments: estimatedInstallments.data,
    forecast,
    segment,
    setSegment,
    groups,
    categories: categories.data ?? [],
    people: people.data ?? [],
    editingId,
    editingTx,
    sheetView,
    setSheetView,
    nameDraft,
    setNameDraft,
    nameError,
    isSavingName: updateDisplayName.isPending,
    openNameEdit,
    saveDisplayName: (displayName: string | null) => void saveDisplayName(displayName),
    openEdit,
    closeEdit,
    alwaysForMerchant,
    setAlwaysForMerchant,
    selectCategory,
    selectPerson,
    acceptSuggestedCategory,
    isSaving: updateCategory.isPending || updatePerson.isPending,
    ruleError,
    openSplit,
    splitPersonIds,
    toggleSplitPerson,
    splitMode,
    setSplitMode,
    splitAmounts,
    setSplitAmount: (personId: string, value: string) =>
      setSplitAmounts((current) => ({ ...current, [personId]: value })),
    saveSplit,
    removeSplit,
    isSavingSplit: replaceSplit.isPending || clearSplit.isPending,
    isPreviewingSplit: previewSplit.isPending,
  }
}
