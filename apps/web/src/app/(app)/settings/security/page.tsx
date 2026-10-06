'use client'

import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { QrCode } from './qr-code'
import { useSecurityPage } from './use-security-page'

export default function SecurityPage() {
  const {
    isLoading,
    enabled,
    step,
    ruleError,
    beginSetup,
    isStartingSetup,
    setup,
    codeForm,
    onSubmitCode,
    isConfirmingSetup,
    recoveryCodes,
    finishSetup,
    beginDisable,
    cancelDisable,
    disableForm,
    onSubmitDisable,
    isDisabling,
  } = useSecurityPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 pt-8 md:pb-10">
      <div className="flex items-center gap-3">
        <IconButton href="/settings/profile">
          <BackIcon />
        </IconButton>
        <div>
          <h1 className="display-number text-[2rem] text-ink">Segurança</h1>
          <p className="text-sm text-muted">Verificação em duas etapas (2FA).</p>
        </div>
      </div>

      {isLoading && <p className="text-text">Carregando…</p>}
      {ruleError && <InlineAlert>{ruleError}</InlineAlert>}

      {!isLoading && step === 'status' && (
        <>
          <p className="text-sm text-text">
            {enabled
              ? 'O 2FA está ligado. Todo login pede o código do seu app autenticador, além da senha.'
              : 'Com o 2FA ligado, o login pede um código de 6 dígitos do seu app autenticador, além da senha.'}
          </p>
          {enabled ? (
            <Button variant="outline" onClick={beginDisable} className="w-full">
              Desligar 2FA
            </Button>
          ) : (
            <Button onClick={() => void beginSetup()} state={isStartingSetup ? 'loading' : 'idle'} className="w-full">
              Ligar 2FA
            </Button>
          )}
        </>
      )}

      {step === 'setup' && setup && (
        <form className="flex flex-col gap-4" onSubmit={onSubmitCode} noValidate>
          <p className="text-sm text-text">
            Escaneie o QR no seu app autenticador (Google Authenticator, Authy, 1Password…) ou digite o código
            manualmente.
          </p>
          <div className="flex justify-center">
            <QrCode value={setup.otpauthUri} />
          </div>
          <div className="rounded-card bg-surface px-4 py-3 text-center">
            <p className="text-xs text-muted">Código manual</p>
            <p className="break-all font-mono text-sm text-ink">{setup.secret}</p>
          </div>
          <Input
            label="Código do app"
            autoComplete="one-time-code"
            autoFocus
            error={codeForm.formState.errors.code?.message}
            {...codeForm.register('code', { required: 'Informe o código.' })}
          />
          <Button type="submit" state={isConfirmingSetup ? 'loading' : 'idle'} className="w-full">
            Confirmar
          </Button>
        </form>
      )}

      {step === 'recovery-codes' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            Guarde estes 10 códigos de recuperação num lugar seguro. Cada um funciona uma vez só, pra entrar se você
            perder acesso ao app autenticador. Eles não aparecem de novo.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-card bg-surface p-4 font-mono text-sm text-ink">
            {recoveryCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <Button onClick={finishSetup} className="w-full">
            Salvei os códigos
          </Button>
        </div>
      )}

      {step === 'disable' && (
        <form className="flex flex-col gap-4" onSubmit={onSubmitDisable} noValidate>
          <p className="text-sm text-text">Confirme sua senha pra desligar o 2FA.</p>
          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            error={disableForm.formState.errors.password?.message}
            {...disableForm.register('password', { required: 'Informe a senha.' })}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={cancelDisable} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" state={isDisabling ? 'loading' : 'idle'} className="flex-1">
              Desligar
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
