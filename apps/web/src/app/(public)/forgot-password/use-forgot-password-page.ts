'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ForgotPasswordInput } from '@gastos/shared'
import { useForgotPassword } from '@/hooks/queries/use-forgot-password'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração. Sempre mostra "se houver conta..." — a API resolve 204 exista ou não o
// e-mail (08-seguranca § 4), então o sucesso aqui não significa "encontramos sua conta".
export function useForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgotPassword.mutateAsync(values)
      setSent(true)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.email?.[0]) setError('email', { message: fieldErrors.email[0] })
    }
  })

  return { register, errors, onSubmit, isPending: forgotPassword.isPending, sent }
}
