'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { useForgotPasswordPage } from './use-forgot-password-page'

export default function ForgotPasswordPage() {
  const { register, errors, onSubmit, isPending, sent } = useForgotPasswordPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-8 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/login">
          <BackIcon />
        </IconButton>
        <div>
          <h1 className="display-number text-[2rem] text-ink">Esqueci minha senha</h1>
          <p className="text-sm text-muted">Manda um link pro seu e-mail pra escolher uma nova.</p>
        </div>
      </div>

      {sent ? (
        <div className="rounded-card-lg bg-tint px-5 py-6 text-ink">
          <p className="font-semibold">
            Se houver uma conta ativa com esse e-mail, o link pra redefinir a senha chega em instantes.
          </p>
          <p className="mt-2 text-sm text-muted">Ele vale por 1 hora. Confira também a caixa de spam.</p>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" state={isPending ? 'loading' : 'idle'} className="mt-2 w-full">
            Enviar link
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-auto pt-10 text-center text-sm font-medium text-border-strong underline underline-offset-4"
      >
        Voltar pro login
      </Link>
    </main>
  )
}
