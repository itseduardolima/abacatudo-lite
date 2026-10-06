'use client'

import type { PersonStatement } from '@gastos/shared'
import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MoneyText } from '@/components/finance/MoneyText'

export function StatementsSheet({
  statements,
  isLoading,
  isError,
  isForecast,
  copiedPersonId,
  isTooLongForLink,
  onSend,
  onCopy,
  onClose,
}: {
  statements: PersonStatement[]
  isLoading: boolean
  isError: boolean
  isForecast: boolean
  copiedPersonId: string | null
  isTooLongForLink: (text: string) => boolean
  onSend: (text: string) => void
  onCopy: (personId: string, text: string) => void
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
        <p className="text-lg font-bold text-ink">Enviar contas</p>
        <p className="mb-3 mt-1 text-sm text-muted">
          {isForecast
            ? 'Previsão: parcelas lançadas e estimadas (marcadas no texto). Nada é enviado sozinho.'
            : 'Fatura aberta: o valor pode mudar até o fechamento. Nada é enviado sozinho.'}
        </p>

        {isLoading && <p className="text-text">Carregando…</p>}
        {isError && <InlineAlert>Não foi possível montar as mensagens agora.</InlineAlert>}
        {!isLoading && !isError && statements.length === 0 && (
          <p className="text-text">Ninguém tem compras neste mês.</p>
        )}

        <div className="flex flex-col gap-5">
          {statements.map((statement) => (
            <div key={statement.personId} className="rounded-card bg-surface px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-semibold text-ink">{statement.personName}</p>
                <MoneyText cents={statement.totalCents} />
              </div>
              <pre className="mt-2.5 whitespace-pre-wrap break-words font-body text-sm text-text">{statement.text}</pre>
              {isTooLongForLink(statement.text) && (
                <p className="mt-2 text-xs text-muted">Texto grande demais para o link do WhatsApp: use Copiar.</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <Button size="sm" disabled={isTooLongForLink(statement.text)} onClick={() => onSend(statement.text)}>
                  WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCopy(statement.personId, statement.text)}>
                  {copiedPersonId === statement.personId ? 'Copiado' : 'Copiar texto'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
