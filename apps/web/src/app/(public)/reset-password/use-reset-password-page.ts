'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useResetPassword } from '@/hooks/queries/use-reset-password'
import { useResetToken } from '@/hooks/queries/use-reset-token'
import { ApiClientError } from '@/lib/api-client'

interface FormValues {
  newPassword: string
}

// Hook de página: só orquestração. Token vem da URL (?token=...) — usuário está deslogado, por isso não
// pede a senha atual (diferente da troca de senha em Meu perfil).
export function useResetPasswordPage() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const tokenInfo = useResetToken(token)
  const resetPassword = useResetPassword()
  const [done, setDone] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { newPassword: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setRuleError(null)
    try {
      await resetPassword.mutateAsync({ token, newPassword: values.newPassword })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.newPassword?.[0]) setError('newPassword', { message: fieldErrors.newPassword[0] })
      else setRuleError(error.error.message)
    }
  })

  return {
    // Sem token nenhum na URL, nem tenta pedir — mesma tela "link inválido", sem round-trip perdido.
    isLoading: token.length > 0 && tokenInfo.isPending,
    // Se o GET falhou, o token já não é utilizável (mesma checagem que o POST final faria) — não faz
    // sentido saber o e-mail aqui, é o mesmo motivo que barra o inspect.
    linkError: token.length === 0 || tokenInfo.isError,
    email: tokenInfo.data?.email,
    register,
    errors,
    onSubmit,
    isPending: resetPassword.isPending,
    ruleError,
    done,
  }
}
