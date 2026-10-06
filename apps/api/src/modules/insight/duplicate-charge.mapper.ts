import type { DuplicateCharge } from '@gastos/shared'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { selfShareCents, type SpendingRow } from './insight.mapper'

// 03-regras-negocio § Relatórios e insights: mesmo merchant + valor em janela de 24h.
const WINDOW_MS = 24 * 60 * 60 * 1000

// Compara cobranças adjacentes (ordenadas por data) do mesmo estabelecimento: mesmo valor (a fatia do dono)
// dentro de 24h é sinal de cobrança duplicada. Sem merchant não dá pra comparar com segurança — fica de fora.
export function detectDuplicateCharges(rows: SpendingRow[], selfPersonId: string): DuplicateCharge[] {
  const groups = new Map<string, { label: string; charges: { at: Date; cents: number }[] }>()
  for (const row of rows) {
    if (row.kind !== 'EXPENSE' || !row.merchant) continue
    const cents = selfShareCents(row, selfPersonId)
    if (cents <= 0) continue
    const key = normalizeMerchant(row.merchant)
    const group = groups.get(key) ?? { label: row.merchant, charges: [] }
    group.charges.push({ at: row.occurredAt, cents })
    groups.set(key, group)
  }

  const duplicates: DuplicateCharge[] = []
  for (const [key, group] of groups) {
    const charges = group.charges.sort((a, b) => a.at.getTime() - b.at.getTime())
    for (let i = 1; i < charges.length; i++) {
      const previous = charges[i - 1]
      const current = charges[i]
      if (!previous || !current || previous.cents !== current.cents) continue
      if (current.at.getTime() - previous.at.getTime() > WINDOW_MS) continue
      duplicates.push({
        key: `${key}-${current.at.toISOString()}`,
        label: group.label,
        amountCents: current.cents,
        firstChargeAt: previous.at.toISOString(),
        secondChargeAt: current.at.toISOString(),
      })
    }
  }
  return duplicates
}
