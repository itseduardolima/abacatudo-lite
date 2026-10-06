'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FixedExpense } from '@gastos/shared'
import { useArchiveFixedExpense } from '@/hooks/queries/use-archive-fixed-expense'
import { useUpdateFixedExpense } from '@/hooks/queries/use-update-fixed-expense'
import { useCreateFixedExpense } from '@/hooks/queries/use-create-fixed-expense'
import { useFixedExpenses } from '@/hooks/queries/use-fixed-expenses'
import { ApiClientError } from '@/lib/api-client'
import { formatMoney, parseMoneyInput } from '@/lib/utils/format-money'

interface FormValues {
  name: string
  amount: string
}

// Hook de página: só orquestração (04-padroes-codigo). `amount` é o texto digitado ("120,00"); vira
// `amountCents` só na hora de mandar pra API (parseMoneyInput) — nunca validado no cliente, só convertido.
export function useFixedExpensesPage() {
  const fixedExpenses = useFixedExpenses()
  const createFixedExpense = useCreateFixedExpense()
  const archiveFixedExpense = useArchiveFixedExpense()
  const updateFixedExpense = useUpdateFixedExpense()
  const [menuId, setMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const submissionRef = useRef(0)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: '', amount: '' } })

  const onSubmit = handleSubmit(async (values) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    const amountCents = parseMoneyInput(values.amount)
    if (Number.isNaN(amountCents)) {
      setError('amount', { message: 'Informe um valor válido.' })
      return
    }

    try {
      const input = { name: values.name, amountCents }
      if (editingId) await updateFixedExpense.mutateAsync({ id: editingId, ...input })
      else await createFixedExpense.mutateAsync(input)
      if (submission !== submissionRef.current) return
      reset()
      setEditingId(null)
      setIsFormOpen(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) setError('name', { message: fieldErrors.name[0] })
      else if (fieldErrors?.amountCents?.[0]) setError('amount', { message: fieldErrors.amountCents[0] })
      else setRuleError(error.error.message)
    }
  })

  return {
    fixedExpenses: fixedExpenses.data ?? [],
    isLoading: fixedExpenses.isPending,
    isFormOpen,
    openForm: () => setIsFormOpen(true),
    closeForm: () => {
      submissionRef.current++
      setIsFormOpen(false)
      setEditingId(null)
      reset()
      setRuleError(null)
    },
    register,
    errors,
    onSubmit,
    isSubmitting: createFixedExpense.isPending || updateFixedExpense.isPending,
    isEditing: editingId !== null,
    menuExpense: fixedExpenses.data?.find((expense) => expense.id === menuId) ?? null,
    openMenu: (id: string) => setMenuId(id),
    closeMenu: () => setMenuId(null),
    startEdit: (expense: FixedExpense) => {
      submissionRef.current++
      setRuleError(null)
      setMenuId(null)
      setEditingId(expense.id)
      reset({ name: expense.name, amount: formatMoney(expense.amountCents).replace('R$ ', '') })
      setIsFormOpen(true)
    },
    ruleError,
    archive: (id: string) => {
      setMenuId(null)
      archiveFixedExpense.mutate(id)
    },
    archivingId: archiveFixedExpense.isPending ? archiveFixedExpense.variables : undefined,
  }
}
