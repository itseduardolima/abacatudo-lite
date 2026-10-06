'use client'

import type { Account } from '@gastos/shared'
import { CalendarDays, Pencil, Tag, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

export function AccountActionsSheet({
  account,
  onRename,
  onPickLogo,
  onBilling,
  onRemove,
  onClose,
}: {
  account: Account
  onRename: () => void
  onPickLogo: () => void
  onBilling: () => void
  onRemove: () => void
  onClose: () => void
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

  const itemClass = 'flex w-full items-center gap-3 border-b border-surface py-3.5 text-left last:border-b-0'

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div
        className="absolute inset-x-2 bottom-0 rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />
        <p className="mb-1 truncate text-lg font-bold text-ink">{account.name}</p>

        <button type="button" onClick={onRename} className={itemClass}>
          <Pencil size={18} strokeWidth={1.8} className="text-ink" />
          <span className="font-medium text-ink">Editar nome</span>
        </button>
        <button type="button" onClick={onPickLogo} className={itemClass}>
          <Tag size={18} strokeWidth={1.8} className="text-ink" />
          <span className="font-medium text-ink">Bandeira do banco</span>
        </button>
        {account.type === 'CREDIT_CARD' && (
          <button type="button" onClick={onBilling} className={itemClass}>
            <CalendarDays size={18} strokeWidth={1.8} className="text-ink" />
            <span className="font-medium text-ink">Fechamento e vencimento</span>
          </button>
        )}
        <button type="button" onClick={onRemove} className={itemClass}>
          <Trash2 size={18} strokeWidth={1.8} className="text-danger" />
          <span className="font-medium text-danger">Remover conta</span>
        </button>
      </div>
    </div>
  )
}
