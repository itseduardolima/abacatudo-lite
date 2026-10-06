import type {
  Establishment,
  FrequentEstablishment,
  MovementReport,
  MovementSpending,
  PixRecipient,
} from '@gastos/shared'
import { cleanName } from '../insight/subscription.mapper'
import { normalizeMerchant } from '../rule/normalize-merchant'

export interface ReportRow {
  kind: string
  amountCents: number
  occurredAt: Date
  description: string
}

const OUT_KINDS = ['EXPENSE', 'CARD_PAYMENT']
const PIX_PREFIX = /^pix\s+/i
const pad = (n: number) => String(n).padStart(2, '0')

function daysInMonthFor(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year as number, monthNumber as number, 0)).getUTCDate()
}

export function computeMovementReport(input: {
  rows: ReportRow[]
  month: string
  balanceCents: number | null
  currentMonthKey: string
  todayDayOfMonth: number
  dayKeyOf: (date: Date) => string
  days?: string[]
  daysRemaining?: number | null
}): Pick<MovementReport, 'incomeCents' | 'expenseCents' | 'resultCents' | 'pace' | 'daily'> {
  const daysInMonth = daysInMonthFor(input.month)
  const expenseByDay = new Map<string, number>()
  let incomeCents = 0
  let expenseCents = 0

  for (const row of input.rows) {
    if (row.kind === 'INCOME') incomeCents += row.amountCents
    if (OUT_KINDS.includes(row.kind)) {
      expenseCents += row.amountCents
      const key = input.dayKeyOf(row.occurredAt)
      expenseByDay.set(key, (expenseByDay.get(key) ?? 0) + row.amountCents)
    }
  }

  let cumulativeExpenseCents = 0
  const days = input.days ?? Array.from({ length: daysInMonth }, (_, index) => `${input.month}-${pad(index + 1)}`)
  const daily = days.map((day) => {
    const dayExpense = expenseByDay.get(day) ?? 0
    cumulativeExpenseCents += dayExpense
    return { day, expenseCents: dayExpense, cumulativeExpenseCents }
  })

  let pace: MovementReport['pace'] = null
  if (input.month === input.currentMonthKey && input.balanceCents !== null && input.daysRemaining !== null) {
    const daysRemaining = input.daysRemaining ?? daysInMonth - (input.todayDayOfMonth - 1)
    pace = {
      daysRemaining,
      perDayCents: daysRemaining > 0 ? Math.max(0, Math.round(input.balanceCents / daysRemaining)) : 0,
    }
  }

  return { incomeCents, expenseCents, resultCents: incomeCents - expenseCents, pace, daily }
}

export function normalizeRecipientKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function recipientName(description: string): string {
  return description.replace(PIX_PREFIX, '').replace(/\s+/g, ' ').trim()
}

export function isSentPix(row: ReportRow): boolean {
  return row.kind === 'EXPENSE' && PIX_PREFIX.test(row.description) && recipientName(row.description) !== ''
}

export function groupPixRecipients(rows: ReportRow[], search?: string): PixRecipient[] {
  const wanted = search ? normalizeRecipientKey(search) : ''
  const groups = new Map<string, { name: string; totalCents: number; count: number; lastAt: Date }>()

  for (const row of rows) {
    if (!isSentPix(row)) continue
    const name = recipientName(row.description)
    const key = normalizeRecipientKey(name)
    if (wanted && !key.includes(wanted)) continue

    const group = groups.get(key)
    if (!group) {
      groups.set(key, { name, totalCents: row.amountCents, count: 1, lastAt: row.occurredAt })
      continue
    }
    group.totalCents += row.amountCents
    group.count += 1
    if (row.occurredAt > group.lastAt) {
      group.lastAt = row.occurredAt
      group.name = name
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      name: group.name,
      totalCents: group.totalCents,
      count: group.count,
      lastAt: group.lastAt.toISOString(),
    }))
    .sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name, 'pt-BR'))
}

export function filterPixRowsByRecipient<T extends ReportRow>(rows: T[], recipientKey: string): T[] {
  return rows.filter((row) => isSentPix(row) && normalizeRecipientKey(recipientName(row.description)) === recipientKey)
}

export function isPixRow(row: Pick<ReportRow, 'description'>): boolean {
  return PIX_PREFIX.test(row.description)
}

export interface HabitRow extends ReportRow {
  merchant: string | null
}

function groupEstablishments(rows: HabitRow[]): Establishment[] {
  const groups = new Map<string, { label: string; count: number; totalCents: number; lastAt: Date }>()

  for (const row of rows) {
    if (row.kind !== 'EXPENSE' || isPixRow(row)) continue
    const label = cleanName(row.merchant ?? row.description)
    const key = normalizeMerchant(label)
    const group = groups.get(key)
    if (!group) {
      groups.set(key, { label, count: 1, totalCents: row.amountCents, lastAt: row.occurredAt })
      continue
    }
    group.count += 1
    group.totalCents += row.amountCents
    if (row.occurredAt > group.lastAt) group.lastAt = row.occurredAt
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    label: group.label,
    count: group.count,
    totalCents: group.totalCents,
    lastAt: group.lastAt.toISOString(),
  }))
}

// Estabelecimentos com >= 2 compras no mês (Pix nunca entra): pega o que não é mensal (corrida, lanche) e
// que o detector de recorrência não pega. Sem categoria — só agrupa pelo nome sem a cidade.
export function frequentEstablishments(rows: HabitRow[], limit = 8): FrequentEstablishment[] {
  return groupEstablishments(rows)
    .filter((group) => group.count >= 2)
    .sort((a, b) => b.count - a.count || b.totalCents - a.totalCents || a.label.localeCompare(b.label, 'pt-BR'))
    .slice(0, limit)
}

// "Para onde vai": saídas por estabelecimento (maiores primeiro), com o resto em "outros", e Pix e pagamento
// de fatura como blocos à parte. Invariante: estabelecimentos + outros + Pix + fatura = saídas do mês.
export function spendingBreakdown(rows: HabitRow[], limit = 10): Omit<MovementSpending, 'month'> {
  const groups = groupEstablishments(rows).sort(
    (a, b) => b.totalCents - a.totalCents || b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'),
  )
  const top = groups.slice(0, limit)
  const otherCents = groups.slice(limit).reduce((sum, group) => sum + group.totalCents, 0)
  const pixCents = rows
    .filter((row) => row.kind === 'EXPENSE' && isPixRow(row))
    .reduce((sum, row) => sum + row.amountCents, 0)
  const cardPaymentCents = rows
    .filter((row) => row.kind === 'CARD_PAYMENT')
    .reduce((sum, row) => sum + row.amountCents, 0)
  const establishmentsCents = top.reduce((sum, group) => sum + group.totalCents, 0)

  return {
    totalCents: establishmentsCents + otherCents + pixCents + cardPaymentCents,
    pixCents,
    cardPaymentCents,
    otherCents,
    establishments: top,
  }
}
