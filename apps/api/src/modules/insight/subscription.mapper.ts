import type { SubscriptionItem, SubscriptionReport } from '@gastos/shared'
import { dateKey, dayOfMonth } from '../../common/date/timezone'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { selfShareCents, type SpendingRow } from './insight.mapper'

// Compra à vista no cartão, com o texto que identifica quem cobrou. Parcela nunca entra: repete valor todo
// mês, mas não é assinatura.
export interface SubscriptionRow extends Pick<SpendingRow, 'kind' | 'amountCents' | 'personId' | 'splits'> {
  occurredAt: Date
  merchant: string | null
  description: string
}

// 03-regras-negocio § Relatórios e insights: ±10% no valor, ~30 dias (±4), >= 3 ocorrências.
const AMOUNT_TOLERANCE_PERCENT = 10
const MIN_GAP_DAYS = 26
const MAX_GAP_DAYS = 34
const MIN_OCCURRENCES = 3
// Uma assinatura que não cobra há mais que isso já foi cancelada (34 dias de intervalo + folga).
const MAX_DAYS_SINCE_LAST_CHARGE = 40

interface Charge {
  at: Date
  day: string
  cents: number
}

// Diferença em dias de calendário entre duas datas "AAAA-MM-DD" (America/Manaus, via dateKey).
function daysBetween(from: string, to: string): number {
  const toUtc = (key: string) => {
    const [year, month, day] = key.split('-').map(Number)
    return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)
  }
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

// A descrição do cartão separa o nome da cidade por um bloco de espaços ("PG *NIO FIBRA     RIO DE JANEIR
// BR"): fica só o nome, e espaços soltos viram um só.
export function cleanName(raw: string): string {
  const name = (raw.trim().split(/\s{2,}/)[0] ?? '').replace(/\s+/g, ' ').trim()
  return name === '' ? raw.replace(/\s+/g, ' ').trim() : name
}

function isSimilarAmount(cents: number, anchorCents: number): boolean {
  return Math.abs(cents - anchorCents) * 100 <= anchorCents * AMOUNT_TOLERANCE_PERCENT
}

// Anda de trás pra frente a partir de `anchorIndex`, só pelas cobranças de valor parecido com a âncora: uma
// compra avulsa de outro valor no meio não quebra a sequência; cobrança colada demais (< 26 dias) é
// duplicidade e é ignorada; buraco maior que 34 dias encerra a sequência.
function chainFrom(charges: Charge[], anchorIndex: number): Charge[] {
  const anchor = charges[anchorIndex]
  if (!anchor) return []
  const chain = [anchor]
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const candidate = charges[i]
    const last = chain[chain.length - 1]
    if (!candidate || !last || !isSimilarAmount(candidate.cents, anchor.cents)) continue
    const gap = daysBetween(candidate.day, last.day)
    if (gap < MIN_GAP_DAYS) continue
    if (gap > MAX_GAP_DAYS) break
    chain.push(candidate)
  }
  return chain
}

export function detectSubscriptions(rows: SubscriptionRow[], selfPersonId: string, today: Date): SubscriptionReport {
  const todayKey = dateKey(today)
  const groups = new Map<string, { label: string; charges: Charge[] }>()
  for (const row of rows) {
    if (row.kind !== 'EXPENSE') continue
    // Lançamento com data futura (manual, por exemplo) ainda não é uma cobrança: contaria como "recente".
    if (daysBetween(dateKey(row.occurredAt), todayKey) < 0) continue
    const cents = selfShareCents(row, selfPersonId)
    if (cents <= 0) continue
    const name = cleanName(row.merchant ?? row.description)
    const key = normalizeMerchant(name)
    const group = groups.get(key) ?? { label: name, charges: [] }
    group.charges.push({ at: row.occurredAt, day: dateKey(row.occurredAt), cents })
    groups.set(key, group)
  }

  const items: SubscriptionItem[] = []
  for (const [key, group] of groups) {
    const charges = group.charges.sort((a, b) => a.at.getTime() - b.at.getTime())
    if (charges.length < MIN_OCCURRENCES) continue

    // Tenta cada cobrança como âncora, da mais recente pra trás: se a última for uma compra avulsa de outro
    // valor, a assinatura de verdade ainda é achada pelas anteriores.
    for (let anchorIndex = charges.length - 1; anchorIndex >= MIN_OCCURRENCES - 1; anchorIndex--) {
      const chain = chainFrom(charges, anchorIndex)
      const latest = chain[0]
      if (chain.length < MIN_OCCURRENCES || !latest) continue
      if (daysBetween(latest.day, todayKey) <= MAX_DAYS_SINCE_LAST_CHARGE) {
        items.push({
          key,
          label: group.label,
          monthlyCents: latest.cents,
          yearlyCents: latest.cents * 12,
          chargeDay: dayOfMonth(latest.at),
          lastChargeAt: latest.at.toISOString(),
          occurrences: chain.length,
        })
      }
      break
    }
  }

  items.sort((a, b) => b.monthlyCents - a.monthlyCents)
  return {
    totalMonthlyCents: items.reduce((sum, item) => sum + item.monthlyCents, 0),
    totalYearlyCents: items.reduce((sum, item) => sum + item.yearlyCents, 0),
    items,
  }
}
