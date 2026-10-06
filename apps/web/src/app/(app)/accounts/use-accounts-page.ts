'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { AccountType, BankLogo, CreateAccountInput } from '@gastos/shared'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useArchiveAccount } from '@/hooks/queries/use-archive-account'
import { useArchivedAccounts } from '@/hooks/queries/use-archived-accounts'
import { useConnectBank } from '@/hooks/queries/use-connect-bank'
import { useCreateAccount } from '@/hooks/queries/use-create-account'
import { useRestoreAccount } from '@/hooks/queries/use-restore-account'
import { useSyncBankConnection } from '@/hooks/queries/use-sync-bank-connection'
import { useUpdateAccount } from '@/hooks/queries/use-update-account'
import { ApiClientError } from '@/lib/api-client'
import { formatMoney, parseMoneyInput } from '@/lib/utils/format-money'

// Hook de página: só orquestração (04-padroes-codigo). Campos de cartão (fechamento, vencimento, limite)
// ficam pra uma próxima etapa — aqui só nome e tipo, o mínimo pra existir a conta.
export function useAccountsPage() {
  const router = useRouter()
  const accounts = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const archiveAccount = useArchiveAccount()
  const archivedAccounts = useArchivedAccounts()
  const restoreAccount = useRestoreAccount()
  const connectBank = useConnectBank()
  const syncBankConnection = useSyncBankConnection()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pickingLogoForId, setPickingLogoForId] = useState<string | null>(null)
  const [menuAccountId, setMenuAccountId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [billingId, setBillingId] = useState<string | null>(null)
  const [closingDayDraft, setClosingDayDraft] = useState('')
  const [dueDayDraft, setDueDayDraft] = useState('')
  const [closedBillDraft, setClosedBillDraft] = useState('')
  const [billingErrors, setBillingErrors] = useState<{
    closingDay?: string
    dueDay?: string
    closedBill?: string
    general?: string
  }>({})
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({ defaultValues: { name: '', type: 'CREDIT_CARD', source: 'MANUAL' } })

  // "Cancelar" não trava enquanto a request está no ar (rede lenta é comum, mobile-first) — esse número
  // marca qual envio ainda importa. Cancelar incrementa; se a resposta (sucesso ou erro) chegar depois de
  // outro cancelamento/reabertura, ela é descartada em vez de reaparecer como erro fora de contexto.
  const submissionRef = useRef(0)

  const onSubmit = handleSubmit(async (values) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      await createAccount.mutateAsync(values)
      if (submission !== submissionRef.current) return
      reset()
      setIsFormOpen(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors) {
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0]) setError(field as keyof CreateAccountInput, { message: messages[0] })
        }
      } else {
        setRuleError(error.error.message)
      }
    }
  })

  // Conectar outro banco (InfinitePay, um segundo cartão...) — antes só existia na Home, e só enquanto
  // não houvesse nenhum cartão ainda (ConnectBankCard some depois do primeiro). "Meu Pluggy" aceita várias
  // conexões, então a tela de contas precisa oferecer isso sempre, não só na primeira vez.
  const onConnectBank = async () => {
    setConnectError(null)
    try {
      const { id, authorizeUrl } = await connectBank.mutateAsync()
      window.open(authorizeUrl, '_blank', 'noopener')
      router.push(`/connect-bank/${id}`)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setConnectError(error.error.message)
    }
  }

  const onSyncBanks = async () => {
    setSyncError(null)
    const connectionIds = new Set(
      (accounts.data ?? [])
        .filter((account) => account.bankConnectionId && !account.disconnected)
        .map((account) => account.bankConnectionId as string),
    )
    for (const connectionId of connectionIds) {
      try {
        await syncBankConnection.mutateAsync(connectionId)
      } catch (error) {
        if (!(error instanceof ApiClientError)) throw error
        setSyncError(error.error.message)
        return
      }
    }
  }

  const closeRename = () => {
    setRenamingId(null)
    setRenameError(null)
  }

  const onSaveRename = async () => {
    if (!renamingId) return
    setRenameError(null)
    try {
      await updateAccount.mutateAsync({ id: renamingId, input: { name: renameDraft } })
      closeRename()
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      setRenameError(fieldErrors?.name?.[0] ?? error.error.message)
    }
  }

  const closeBilling = () => {
    setBillingId(null)
    setBillingErrors({})
  }

  const onSaveBilling = async () => {
    if (!billingId) return
    setBillingErrors({})
    const input = {
      ...(closingDayDraft.trim() ? { closingDay: Number(closingDayDraft) } : {}),
      ...(dueDayDraft.trim() ? { dueDay: Number(dueDayDraft) } : {}),
      closedBillCents: closedBillDraft.trim() ? parseMoneyInput(closedBillDraft) : null,
    }
    try {
      await updateAccount.mutateAsync({ id: billingId, input })
      closeBilling()
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      setBillingErrors({
        closingDay: fieldErrors?.closingDay?.[0],
        dueDay: fieldErrors?.dueDay?.[0],
        closedBill: fieldErrors?.closedBillCents?.[0],
        general:
          fieldErrors?.closingDay || fieldErrors?.dueDay || fieldErrors?.closedBillCents
            ? undefined
            : error.error.message,
      })
    }
  }

  return {
    accounts: accounts.data ?? [],
    isLoadingAccounts: accounts.isPending,
    isFormOpen,
    openForm: () => setIsFormOpen(true),
    closeForm: () => {
      submissionRef.current++
      setIsFormOpen(false)
      reset()
      setRuleError(null)
    },
    register,
    errors,
    type: watch('type'),
    setType: (value: AccountType) => setValue('type', value),
    onSubmit,
    isSubmitting: createAccount.isPending,
    ruleError,
    // Fase 4: marca/desmarca qual conta CHECKING alimenta "renda de benefícios" (/settings/income).
    onConnectBank: () => void onConnectBank(),
    isConnectingBank: connectBank.isPending,
    connectError,
    onSyncBanks: () => void onSyncBanks(),
    isSyncingBanks: syncBankConnection.isPending,
    syncError,
    archive: (id: string) => archiveAccount.mutate(id),
    removedAccounts: (archivedAccounts.data ?? []).filter((account) => account.source === 'PLUGGY'),
    restore: (id: string) => restoreAccount.mutate(id),
    restoringId: restoreAccount.isPending ? restoreAccount.variables : undefined,
    menuAccountId,
    openMenu: (id: string) => setMenuAccountId(id),
    closeMenu: () => setMenuAccountId(null),
    renamingId,
    renameDraft,
    setRenameDraft,
    renameError,
    isRenaming: updateAccount.isPending,
    openRename: (id: string, currentName: string) => {
      setRenamingId(id)
      setRenameDraft(currentName)
      setRenameError(null)
    },
    billingId,
    closingDayDraft,
    dueDayDraft,
    closedBillDraft,
    setClosedBillDraft,
    setClosingDayDraft,
    setDueDayDraft,
    billingErrors,
    openBilling: (id: string, closingDay: number | null, dueDay: number | null, closedBillCents: number | null) => {
      setBillingId(id)
      setClosingDayDraft(closingDay ? String(closingDay) : '')
      setDueDayDraft(dueDay ? String(dueDay) : '')
      setClosedBillDraft(closedBillCents !== null ? formatMoney(closedBillCents).replace('R$ ', '') : '')
      setBillingErrors({})
    },
    closeBilling,
    onSaveBilling: () => void onSaveBilling(),
    closeRename,
    onSaveRename: () => void onSaveRename(),
    // Bandeira do banco (DESIGN_SYSTEM § Logos de bancos) — marca manual, nunca por heurística de nome.
    pickingLogoForId,
    openLogoPicker: (id: string) => setPickingLogoForId(id),
    closeLogoPicker: () => setPickingLogoForId(null),
    selectBankLogo: (id: string, bankLogo: BankLogo | null) => {
      updateAccount.mutate({ id, input: { bankLogo } })
      setPickingLogoForId(null)
    },
  }
}
