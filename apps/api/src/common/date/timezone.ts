import { DomainError } from '../errors/domain.error'

// "Mês" e "dia" do produto são sempre calculados em America/Manaus, nunca em UTC (03-regras-negocio).
export const PRODUCT_TIME_ZONE = 'America/Manaus'

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PRODUCT_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function zonedParts(date: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const parts = PARTS_FORMATTER.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function monthKey(date: Date): string {
  const { year, month } = zonedParts(date)
  return `${year}-${pad(month)}`
}

export function dateKey(date: Date): string {
  const { year, month, day } = zonedParts(date)
  return `${year}-${pad(month)}-${pad(day)}`
}

// Dia do mês (1-31) em America/Manaus — usado pelo cálculo de ritmo (7.4) pra saber quantos dias do mês
// já passaram de verdade, nunca no fuso do servidor.
export function dayOfMonth(date: Date): number {
  return zonedParts(date).day
}

// Sem hardcodar o offset: descobre o offset real comparando o instante "chutado" com o que ele parece no fuso.
function zonedTimeToUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const seenInZone = zonedParts(guess)
  const seenAsUtc = Date.UTC(
    seenInZone.year,
    seenInZone.month - 1,
    seenInZone.day,
    seenInZone.hour,
    seenInZone.minute,
    seenInZone.second,
  )
  const offsetMinutes = (seenAsUtc - guess.getTime()) / 60_000
  return new Date(guess.getTime() - offsetMinutes * 60_000)
}

// Fim exclusivo: usar em `occurredAt >= start AND occurredAt < end`.
export function monthRange(monthKeyValue: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthKeyValue)
  if (!match) throw new Error(`monthKey inválido (esperado AAAA-MM): "${monthKeyValue}"`)
  const year = Number(match[1])
  const month = Number(match[2])
  const start = zonedTimeToUtc(year, month, 1)
  const end = month === 12 ? zonedTimeToUtc(year + 1, 1, 1) : zonedTimeToUtc(year, month + 1, 1)
  return { start, end }
}

// Resolve o `month` de query string (ou o mês atual) pro range usado nos filtros — mesma validação que
// Transaction/Movement precisavam repetir.
export function resolveMonthRange(month?: string): { start: Date; end: Date } {
  const key = month ?? monthKey(new Date())
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
    throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
  }
  return monthRange(key)
}

// Desloca um monthKey por `delta` meses (negativo = passado) — usado pra janela "mês anterior" / "média
// dos 3 meses anteriores" dos relatórios (03-regras-negocio § Relatórios e insights).
export function shiftMonthKey(monthKeyValue: string, delta: number): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthKeyValue)
  if (!match) throw new Error(`monthKey inválido (esperado AAAA-MM): "${monthKeyValue}"`)
  const year = Number(match[1])
  const month = Number(match[2])
  const total = year * 12 + (month - 1) + delta
  const newYear = Math.floor(total / 12)
  const newMonth = (total % 12) + 1
  return `${newYear}-${pad(newMonth)}`
}

// Data pura ("2026-09-21", sem hora — o Pluggy manda assim às vezes, e é o que um `<input type="date">`
// de lançamento manual também dá) vira meio-dia UTC, pra nunca cruzar dia ao converter para
// America/Manaus (UTC-4) nas contas de mês/dia do produto.
export function dayFromDateString(date: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00.000Z`) : new Date(date)
}

// Início do dia do último fechamento (dia `closingDay`, já ocorrido hoje ou antes), à meia-noite de Brasília
// (UTC-3, sem horário de verão): os bancos fecham a fatura pelo dia de Brasília, e a data que o banco manda
// para uma compra costuma vir 00:00 de Brasília, que em Manaus seria 23:00 do dia anterior. Como
// no Nubank e no "melhor dia de compra" dos bancos, a compra feita no dia do fechamento já vai pra fatura
// seguinte. O que for lançado a partir daqui pertence à fatura aberta. Dia > fim do mês cai no último dia.
export function lastClosingCutoff(closingDay: number, now: Date = new Date()): Date {
  const { year, month, day } = zonedParts(now)
  const closingIn = (y: number, m: number) => Math.min(closingDay, new Date(Date.UTC(y, m, 0)).getUTCDate())
  const [y, m] = closingIn(year, month) <= day ? [year, month] : month === 1 ? [year - 1, 12] : [year, month - 1]
  return new Date(Date.UTC(y, m - 1, closingIn(y, m), 3))
}

export function nextClosingCutoff(closingDay: number, now: Date = new Date()): Date {
  return lastClosingCutoff(closingDay, new Date(lastClosingCutoff(closingDay, now).getTime() + 32 * 86_400_000))
}

export const BENEFIT_DEPOSIT_DAY = 30

// Período da conta de benefício: o dinheiro do mês entra no dia 30 do mês anterior, então o "mês" vai do dia 30
// do anterior (inclusive) até o dia 30 do próprio mês (exclusive). Dia 30 em mês curto cai no último dia.
export function benefitPeriodRange(monthKeyValue: string): { start: Date; end: Date } {
  const [year, month] = monthKeyValue.split('-').map(Number) as [number, number]
  const depositDayIn = (y: number, m: number) => Math.min(BENEFIT_DEPOSIT_DAY, new Date(Date.UTC(y, m, 0)).getUTCDate())
  const [prevYear, prevMonth] = month === 1 ? [year - 1, 12] : [year, month - 1]
  return {
    start: zonedTimeToUtc(prevYear, prevMonth, depositDayIn(prevYear, prevMonth)),
    end: zonedTimeToUtc(year, month, depositDayIn(year, month)),
  }
}
