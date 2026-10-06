'use client'

import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useProfilePage } from './use-profile-page'

export default function ProfilePage() {
  const {
    isLoading,
    profileForm,
    onSubmitProfile,
    isSavingProfile,
    profileSaved,
    passwordForm,
    onSubmitPassword,
    isSavingPassword,
    passwordSaved,
  } = useProfilePage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-8 px-4 pb-28 pt-8 md:pb-10">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <div>
          <h1 className="display-number text-[2rem] text-ink">Meu perfil</h1>
          <p className="text-sm text-muted">Seu nome, e-mail e senha de acesso.</p>
        </div>
      </div>

      {isLoading && <p className="text-text">Carregando…</p>}

      {!isLoading && (
        <>
          <form className="flex flex-col gap-4" onSubmit={onSubmitProfile} noValidate>
            <p className="text-sm font-semibold text-muted">Dados pessoais</p>
            <Input label="Nome" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              error={profileForm.formState.errors.email?.message}
              {...profileForm.register('email')}
            />
            <Button
              type="submit"
              className="mt-2"
              state={isSavingProfile ? 'loading' : 'idle'}
              disabled={!profileForm.formState.isDirty}
            >
              Salvar
            </Button>
            {profileSaved && <p className="text-sm text-primary-ink">Salvo.</p>}
          </form>

          <form className="flex flex-col gap-4 border-t border-surface pt-8" onSubmit={onSubmitPassword} noValidate>
            <p className="text-sm font-semibold text-muted">Trocar senha</p>
            <PasswordInput
              label="Senha atual"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <PasswordInput
              label="Nova senha"
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <Button type="submit" className="mt-2" state={isSavingPassword ? 'loading' : 'idle'}>
              Trocar senha
            </Button>
            {passwordSaved && <p className="text-sm text-primary-ink">Senha alterada.</p>}
          </form>
        </>
      )}
    </main>
  )
}
