'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ChangePasswordInput, UpdateProfileInput } from '@gastos/shared'
import { useChangePassword } from '@/hooks/queries/use-change-password'
import { useMe } from '@/hooks/queries/use-me'
import { useUpdateProfile } from '@/hooks/queries/use-update-profile'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração. Duas mutações independentes (nome/e-mail vs senha) — trocar senha tem
// regra de segurança diferente (confirmar a atual), não faz sentido no mesmo formulário/payload.
export function useProfilePage() {
  const me = useMe()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const profileForm = useForm<UpdateProfileInput>({ defaultValues: { name: '', email: '' } })
  useEffect(() => {
    if (me.data) profileForm.reset({ name: me.data.name, email: me.data.email })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só preenche quando os dados chegam, nunca sobrescreve edição em andamento
  }, [me.data])

  const onSubmitProfile = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) profileForm.setError('name', { message: fieldErrors.name[0] })
      else if (fieldErrors?.email?.[0]) profileForm.setError('email', { message: fieldErrors.email[0] })
      else profileForm.setError('email', { message: error.error.message })
    }
  })

  const passwordForm = useForm<ChangePasswordInput>({ defaultValues: { currentPassword: '', newPassword: '' } })
  const [passwordSaved, setPasswordSaved] = useState(false)

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    setPasswordSaved(false)
    try {
      await changePassword.mutateAsync(values)
      passwordForm.reset({ currentPassword: '', newPassword: '' })
      setPasswordSaved(true)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.newPassword?.[0]) passwordForm.setError('newPassword', { message: fieldErrors.newPassword[0] })
      else passwordForm.setError('currentPassword', { message: error.error.message })
    }
  })

  return {
    isLoading: me.isPending,
    profileForm,
    onSubmitProfile,
    isSavingProfile: updateProfile.isPending,
    profileSaved: updateProfile.isSuccess && !profileForm.formState.isDirty,
    passwordForm,
    onSubmitPassword,
    isSavingPassword: changePassword.isPending,
    passwordSaved,
  }
}
