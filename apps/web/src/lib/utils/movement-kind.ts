import type { TransactionKind } from '@gastos/shared'

// Extrato (03-regras-negocio § Movimentações): o sinal e o rótulo vêm só do `kind` que a API já classificou
// — nunca de heurística no texto. TRANSFER não diz pra que lado o dinheiro foi, então não leva sinal.
export type MovementDirection = 'IN' | 'OUT' | 'NEUTRAL'

export function movementDirection(kind: TransactionKind): MovementDirection {
  if (kind === 'INCOME' || kind === 'REFUND') return 'IN'
  if (kind === 'TRANSFER') return 'NEUTRAL'
  return 'OUT'
}

export function movementTag(kind: TransactionKind): { label: string; tone: 'tint' | 'soft' } | null {
  if (kind === 'TRANSFER') return { label: 'entre suas contas', tone: 'tint' }
  if (kind === 'CARD_PAYMENT') return { label: 'fatura do cartão', tone: 'soft' }
  return null
}
