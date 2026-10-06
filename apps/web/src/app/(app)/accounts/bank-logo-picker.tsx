'use client'

import type { BankLogo } from '@gastos/shared'
import { Check } from 'lucide-react'
import { useEffect } from 'react'
import { BANK_LOGO_LABEL, BankAvatar } from '@/components/finance/BankAvatar'

const OPTIONS: BankLogo[] = ['nubank', 'banco-do-brasil', 'picpay', 'infinitepay']

// Mesmo padrão de bottom sheet do protótipo (véu + folha com puxador, já usado no menu Configurar e no
// detalhe de transação) — escolher fecha na hora, sem botão "Salvar" à parte.
export function BankLogoPicker({
  accountName,
  current,
  onSelect,
  onClose,
}: {
  accountName: string
  current: BankLogo | null
  onSelect: (logo: BankLogo | null) => void
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
        className="absolute inset-x-2 bottom-0 rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />
        <p className="mb-1 text-lg font-bold text-ink">Bandeira do banco</p>
        <p className="mb-3 text-sm text-muted">Pra identificar {accountName} de relance.</p>

        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex w-full items-center gap-3 border-b border-surface py-3 text-left"
        >
          <BankAvatar bankLogo={null} fallbackInitial={accountName.charAt(0).toUpperCase()} size={40} />
          <span className="flex-1 font-medium text-ink">Sem logo (iniciais)</span>
          {current === null && <Check size={18} strokeWidth={2.2} className="text-primary-ink" />}
        </button>

        {OPTIONS.map((logo) => (
          <button
            key={logo}
            type="button"
            onClick={() => onSelect(logo)}
            className="flex w-full items-center gap-3 border-b border-surface py-3 text-left last:border-b-0"
          >
            <BankAvatar bankLogo={logo} fallbackInitial="?" size={40} />
            <span className="flex-1 font-medium text-ink">{BANK_LOGO_LABEL[logo]}</span>
            {current === logo && <Check size={18} strokeWidth={2.2} className="text-primary-ink" />}
          </button>
        ))}
      </div>
    </div>
  )
}
