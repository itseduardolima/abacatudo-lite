'use client'

import type { PixRecipientsResponse } from '@gastos/shared'
import { Search } from 'lucide-react'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'

// Pix enviados por favorecido (03-regras-negocio § Extrato e relatório da conta de benefício). O nome vem
// da descrição do banco e só aparece aqui e no extrato, pro próprio usuário. Não diz se é pessoa ou
// estabelecimento — o app não sabe, e nunca adivinha.
export function PixRecipientsSection({
  data,
  search,
  onSearchChange,
  onOpenRecipient,
}: {
  data: PixRecipientsResponse | undefined
  search: string
  onSearchChange: (value: string) => void
  onOpenRecipient: (key: string, name: string) => void
}) {
  return (
    <section aria-label="Pix por favorecido">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-ink">Pix enviados</h3>
        {data && <MoneyText cents={data.totalCents} />}
      </div>

      <label className="mt-3 flex h-11 items-center gap-2 rounded-pill bg-surface px-4 text-muted">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar favorecido"
          aria-label="Buscar favorecido"
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </label>

      {data && data.recipients.length === 0 && (
        <p className="pt-4 text-text">
          {search ? 'Nenhum favorecido com esse nome.' : 'Nenhum Pix enviado neste mês.'}
        </p>
      )}

      <ul className="mt-1">
        {(data?.recipients ?? []).map((recipient) => (
          <li key={recipient.key} className="border-b border-surface last:border-b-0">
            <button
              type="button"
              onClick={() => onOpenRecipient(recipient.key, recipient.name)}
              className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{recipient.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {recipient.count} Pix · último {formatShortDate(recipient.lastAt)}
                </p>
              </div>
              <MoneyText cents={recipient.totalCents} className="flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
