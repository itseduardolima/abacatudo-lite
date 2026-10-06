'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useBudgetMonth } from '@/hooks/queries/use-budget-month'
import { useUpdateBudgetMonth } from '@/hooks/queries/use-update-budget-month'
import { ApiClientError } from '@/lib/api-client'
import { formatMoney, parseMoneyInput } from '@/lib/utils/format-money'

interface FormValues {
  income: string
  benefit: string
}

// Hook de página: só orquestração (04-padroes-codigo). Renda é o teto do ritmo (HU 7.4). Benefício: se
// existir uma conta marcada como benefício (accounts/page.tsx) com saldo sincronizado pelo Pluggy, usa esse
// saldo automaticamente e o campo vira só leitura (Fase 4, TODO.md); sem conta conectada, continua digitado
// à mão como antes. fixedExpensesCents/savingsGoalCents do PUT (a API exige os 4 juntos) vão zerados — a
// lista de gastos fixos nova já não usa mais aquele campo único.
export function useIncomePage() {
  const budgetMonth = useBudgetMonth()
  const accounts = useAccounts()
  const updateBudgetMonth = useUpdateBudgetMonth()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: { income: '', benefit: '' } })

  const benefitAccount = accounts.data?.find((account) => account.isBenefitAccount) ?? null
  const benefitFromAccountCents = benefitAccount?.balanceCents ?? null

  // isDirty num ref (não na dependência do efeito): um sync em segundo plano pode mudar
  // benefitFromAccountCents a qualquer momento (refetch de accounts) — sem essa checagem, reset()
  // descartava silenciosamente uma edição de "renda mensal" ainda não salva.
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty

  useEffect(() => {
    if (!budgetMonth.data || isDirtyRef.current) return
    reset({
      income: formatMoney(budgetMonth.data.incomeCents).replace('R$ ', ''),
      benefit: formatMoney(benefitFromAccountCents ?? budgetMonth.data.benefitCents).replace('R$ ', ''),
    })
  }, [budgetMonth.data, benefitFromAccountCents, reset])

  const onSubmit = handleSubmit(async (values) => {
    const incomeCents = parseMoneyInput(values.income)
    if (Number.isNaN(incomeCents)) {
      setError('income', { message: 'Informe um valor válido.' })
      return
    }

    const benefitCents = benefitFromAccountCents ?? parseMoneyInput(values.benefit)
    if (Number.isNaN(benefitCents)) {
      setError('benefit', { message: 'Informe um valor válido.' })
      return
    }

    try {
      await updateBudgetMonth.mutateAsync({
        incomeCents,
        benefitCents,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
      })
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.incomeCents?.[0]) setError('income', { message: fieldErrors.incomeCents[0] })
      else if (fieldErrors?.benefitCents?.[0]) setError('benefit', { message: fieldErrors.benefitCents[0] })
    }
  })

  return {
    isLoading: budgetMonth.isPending || accounts.isPending,
    register,
    errors,
    onSubmit,
    isSaving: updateBudgetMonth.isPending,
    isDirty,
    saved: updateBudgetMonth.isSuccess && !isDirty,
    benefitAccountName: benefitFromAccountCents != null ? (benefitAccount?.name ?? null) : null,
  }
}
