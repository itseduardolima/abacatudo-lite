'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useBudgetMonth } from '@/hooks/queries/use-budget-month'
import { useUpdateBudgetMonth } from '@/hooks/queries/use-update-budget-month'
import { ApiClientError } from '@/lib/api-client'
import { formatMoney, parseMoneyInput } from '@/lib/utils/format-money'

interface FormValues {
  income: string
}

// Hook de página: só orquestração (04-padroes-codigo). Renda é o teto do ritmo (HU 7.4).
// fixedExpensesCents/savingsGoalCents do PUT (a API exige os 4 juntos) vão zerados — a
// lista de gastos fixos nova já não usa mais aquele campo único.
export function useIncomePage() {
  const router = useRouter()
  const budgetMonth = useBudgetMonth()
  const updateBudgetMonth = useUpdateBudgetMonth()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: { income: '' } })

  // isDirty num ref (não na dependência do efeito): um refetch não pode descartar uma edição ainda não salva.
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty

  useEffect(() => {
    if (!budgetMonth.data || isDirtyRef.current) return
    reset({ income: formatMoney(budgetMonth.data.incomeCents).replace('R$ ', '') })
  }, [budgetMonth.data, reset])

  const onSubmit = handleSubmit(async (values) => {
    const incomeCents = parseMoneyInput(values.income)
    if (Number.isNaN(incomeCents)) {
      setError('income', { message: 'Informe um valor válido.' })
      return
    }

    try {
      await updateBudgetMonth.mutateAsync({
        incomeCents,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
      })
      router.push('/')
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.incomeCents?.[0]) setError('income', { message: fieldErrors.incomeCents[0] })
    }
  })

  return {
    isLoading: budgetMonth.isPending,
    register,
    errors,
    onSubmit,
    isSaving: updateBudgetMonth.isPending,
    isDirty,
    saved: updateBudgetMonth.isSuccess && !isDirty,
  }
}
