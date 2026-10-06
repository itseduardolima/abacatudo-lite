'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useResetPasswordPage } from './use-reset-password-page'

// useSearchParams exige Suspense (Next.js) — sem isso o build falha.
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const { isLoading, linkError, email, register, errors, onSubmit, isPending, ruleError, done } = useResetPasswordPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col px-4 pb-8 pt-8">
      <Logo height={52} />

      {isLoading && (
        <p className="mt-11 text-center text-text" role="status">
          Conferindo o link…
        </p>
      )}

      {!isLoading && linkError && (
        <div className="mt-11 flex flex-col gap-4">
          <InlineAlert>Este link não é válido ou já expirou. Peça um novo.</InlineAlert>
          <Link href="/forgot-password">
            <Button className="w-full">Pedir um novo link</Button>
          </Link>
        </div>
      )}

      {!isLoading && !linkError && done && (
        <div className="mt-11 rounded-card-lg bg-tint px-5 py-6 text-ink">
          <p className="font-semibold">Senha redefinida.</p>
          <p className="mt-2 text-sm text-muted">Levando você pro login…</p>
        </div>
      )}

      {!isLoading && !linkError && !done && (
        <>
          <h1 className="display-number mt-11 text-[2.5rem] text-ink">Escolher nova senha</h1>
          {email && <p className="mt-2 text-text">Para a conta {email}.</p>}
          <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
            <PasswordInput
              label="Nova senha"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Button type="submit" state={isPending ? 'loading' : 'idle'} className="mt-2 w-full">
              Salvar nova senha
            </Button>
          </form>
        </>
      )}
    </main>
  )
}
