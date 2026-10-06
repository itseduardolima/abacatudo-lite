import type { AccountType } from '@gastos/shared'

// Só cartão de crédito é gerenciado (categoria, pessoa, orçamento); o resto é só consulta
// (03-regras-negocio § Escopo) — o rótulo não esconde essa diferença.
const LABELS: Record<AccountType, string> = {
  CREDIT_CARD: 'Cartão de crédito',
  CHECKING: 'Conta corrente',
  CASH: 'Carteira',
}

export function formatAccountType(type: AccountType): string {
  return LABELS[type]
}
