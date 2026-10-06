'use client'

import type { Transaction } from '@gastos/shared'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { MovementRow } from '../movement-row'

export function PixRecipientSheet({
  name,
  transactions,
  isLoading,
  accountName,
  onClose,
}: {
  name: string
  transactions: Transaction[]
  isLoading: boolean
  accountName: string
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

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div
        className="absolute inset-x-2 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-lg font-bold text-ink">{name}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        {isLoading && <p className="pt-3 text-text">Carregando…</p>}
        {transactions.map((movement) => (
          <MovementRow key={movement.id} movement={movement} accountName={accountName} />
        ))}
      </div>
    </div>
  )
}
