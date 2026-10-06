'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useLoginPage } from './use-login-page'

export default function LoginPage() {
  const {
    register,
    errors,
    onSubmit,
    isPending,
    ruleError,
    mfaRequired,
    codeForm,
    onSubmitCode,
    isVerifyingCode,
    backToPassword,
  } = useLoginPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col px-4 pb-8 pt-8">
      <Logo height={52} />
      <h1 className="display-number mt-11 text-[3.75rem] text-ink">Da fatura, só o que é seu.</h1>

      {!mfaRequired ? (
        <form className="mt-11 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="flex flex-col gap-1.5">
            <PasswordInput
              label="Senha"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Link
              href="/forgot-password"
              className="self-end text-sm font-medium text-border-strong underline underline-offset-4"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Button type="submit" state={isPending ? 'loading' : 'idle'} className="mt-2 w-full">
            Entrar
          </Button>
        </form>
      ) : (
        <form className="mt-11 flex flex-col gap-4" onSubmit={onSubmitCode} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <p className="text-sm text-muted">
            Abra o app autenticador e digite o código de 6 dígitos, ou um dos seus códigos de recuperação.
          </p>
          <Input
            label="Código"
            autoComplete="one-time-code"
            autoFocus
            error={codeForm.formState.errors.code?.message}
            {...codeForm.register('code', { required: 'Informe o código.' })}
          />
          <Button type="submit" state={isVerifyingCode ? 'loading' : 'idle'} className="mt-2 w-full">
            Confirmar
          </Button>
          <button
            type="button"
            onClick={backToPassword}
            className="self-center text-sm font-medium text-border-strong underline underline-offset-4"
          >
            Voltar
          </button>
        </form>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-muted">O acesso é só por convite.</p>
    </main>
  )
}
