'use client'

import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useIncomePage } from './use-income-page'

export default function IncomePage() {
  const { isLoading, register, errors, onSubmit, isSaving, isDirty, saved, benefitAccountName } = useIncomePage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 pt-8 md:pb-10">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <div>
          <h1 className="display-number text-[2rem] text-ink">Renda</h1>
          <p className="text-sm text-muted">Seu salário vira o teto do mês, na Início.</p>
        </div>
      </div>

      {isLoading && <p className="text-text">Carregando…</p>}

      {!isLoading && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <MoneyInput label="Salário" error={errors.income?.message} {...register('income')} />
          <MoneyInput
            label="Renda de benefícios"
            error={errors.benefit?.message}
            disabled={benefitAccountName != null}
            {...register('benefit')}
          />
          {benefitAccountName && (
            <p className="-mt-2 text-sm text-muted">Sincronizado da conta {benefitAccountName}.</p>
          )}
          <Button type="submit" className="mt-2" state={isSaving ? 'loading' : 'idle'} disabled={!isDirty}>
            Salvar
          </Button>
          {saved && <p className="text-sm text-primary-ink">Salvo.</p>}
        </form>
      )}
    </main>
  )
}
