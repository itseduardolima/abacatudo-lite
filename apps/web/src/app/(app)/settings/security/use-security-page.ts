'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useConfirmTwoFactor } from '@/hooks/queries/use-confirm-two-factor'
import { useDisableTwoFactor } from '@/hooks/queries/use-disable-two-factor'
import { useStartTwoFactorSetup } from '@/hooks/queries/use-start-two-factor-setup'
import { useTwoFactorStatus } from '@/hooks/queries/use-two-factor-status'
import { ApiClientError } from '@/lib/api-client'

type Step = 'status' | 'setup' | 'recovery-codes' | 'disable'

interface CodeForm {
  code: string
}

interface DisableForm {
  password: string
}

// Hook de página: só orquestração. Ligar o 2FA é 3 passos (QR/segredo -> confirmar código -> guardar os
// códigos de recuperação, mostrados uma vez só); desligar é 1 passo (confirmar a senha) — cada erro fica no
// formulário do passo em que aconteceu, nunca um alerta solto.
export function useSecurityPage() {
  const status = useTwoFactorStatus()
  const startSetup = useStartTwoFactorSetup()
  const confirmSetup = useConfirmTwoFactor()
  const disable = useDisableTwoFactor()

  const [step, setStep] = useState<Step>('status')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [ruleError, setRuleError] = useState<string | null>(null)

  const codeForm = useForm<CodeForm>({ defaultValues: { code: '' } })
  const disableForm = useForm<DisableForm>({ defaultValues: { password: '' } })

  const beginSetup = async () => {
    setRuleError(null)
    try {
      await startSetup.mutateAsync()
      setStep('setup')
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setRuleError(error.error.message)
    }
  }

  const onSubmitCode = codeForm.handleSubmit(async (values) => {
    setRuleError(null)
    try {
      const result = await confirmSetup.mutateAsync({ code: values.code })
      setRecoveryCodes(result.recoveryCodes)
      setStep('recovery-codes')
      codeForm.reset({ code: '' })
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setRuleError(error.error.message)
    }
  })

  const finishSetup = () => {
    setRecoveryCodes([])
    setStep('status')
  }

  const beginDisable = () => {
    setRuleError(null)
    disableForm.reset({ password: '' })
    setStep('disable')
  }

  const cancelDisable = () => {
    setRuleError(null)
    setStep('status')
  }

  const onSubmitDisable = disableForm.handleSubmit(async (values) => {
    setRuleError(null)
    try {
      await disable.mutateAsync({ password: values.password })
      setStep('status')
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setRuleError(error.error.message)
    }
  })

  return {
    isLoading: status.isPending,
    enabled: status.data?.enabled ?? false,
    step,
    ruleError,
    beginSetup,
    isStartingSetup: startSetup.isPending,
    setup: startSetup.data,
    codeForm,
    onSubmitCode,
    isConfirmingSetup: confirmSetup.isPending,
    recoveryCodes,
    finishSetup,
    beginDisable,
    cancelDisable,
    disableForm,
    onSubmitDisable,
    isDisabling: disable.isPending,
  }
}
