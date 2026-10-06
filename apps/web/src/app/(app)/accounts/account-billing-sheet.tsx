'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function AccountBillingSheet({
  accountName,
  closingDay,
  dueDay,
  onChangeClosingDay,
  onChangeDueDay,
  onSave,
  onClose,
  isSaving,
  errors,
}: {
  accountName: string
  closingDay: string
  dueDay: string
  onChangeClosingDay: (value: string) => void
  onChangeDueDay: (value: string) => void
  onSave: () => void
  onClose: () => void
  isSaving: boolean
  errors: { closingDay?: string; dueDay?: string; general?: string }
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-scrim" />
      <form
        className="absolute inset-x-2 bottom-0 rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
        noValidate
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />
        <p className="mb-1 truncate text-lg font-bold text-ink">{accountName}</p>
        <p className="mb-3 text-sm text-muted">
          Dia do mês em que a fatura fecha e vence. O banco nem sempre informa, e o que você digitar aqui é mantido.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            label="Dia do fechamento"
            inputMode="numeric"
            value={closingDay}
            onChange={(event) => onChangeClosingDay(event.target.value)}
            error={errors.closingDay}
          />
          <Input
            label="Dia do vencimento"
            inputMode="numeric"
            value={dueDay}
            onChange={(event) => onChangeDueDay(event.target.value)}
            error={errors.dueDay ?? errors.general}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" state={isSaving ? 'loading' : 'idle'}>
            Salvar
          </Button>
          <Button type="button" variant="link" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
