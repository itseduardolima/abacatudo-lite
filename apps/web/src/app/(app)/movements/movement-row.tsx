import type { Transaction } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatTime } from '@/lib/utils/format-date'
import { formatDisplayName } from '@/lib/utils/format-display-name'
import { movementDirection, movementTag } from '@/lib/utils/movement-kind'

// Linha do extrato (protótipo 19-extrato, mv): título, "conta, hora", valor com sinal e, quando é
// transferência entre contas ou pagamento de fatura, um rótulo. Sem categoria, pessoa nem divisão — isso só
// existe no cartão (03-regras-negocio § Escopo).
export function MovementRow({ movement, accountName }: { movement: Transaction; accountName: string }) {
  const direction = movementDirection(movement.kind)
  const tag = movementTag(movement.kind)
  const isIn = direction === 'IN'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{formatDisplayName(movement.merchant ?? movement.description)}</p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {accountName}, {formatTime(movement.occurredAt)}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className={isIn ? 'font-bold text-primary-ink' : 'text-ink'}>
          {direction === 'IN' && '+ '}
          {direction === 'OUT' && '− '}
          <MoneyText cents={movement.amountCents} className={isIn ? '!text-primary-ink' : ''} />
        </span>
        {tag && (
          <span
            className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${
              tag.tone === 'tint' ? 'bg-tint text-primary-ink' : 'bg-surface text-text'
            }`}
          >
            {tag.label}
          </span>
        )}
      </div>
    </div>
  )
}
