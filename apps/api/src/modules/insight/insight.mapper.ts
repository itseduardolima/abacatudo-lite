import type { SpendingBreakdownItem } from '@gastos/shared'
import { dayOfMonth, monthKey, shiftMonthKey } from '../../common/date/timezone'
import { normalizeMerchant } from '../rule/normalize-merchant'

export interface SpendingRow {
  kind: 'EXPENSE' | 'REFUND'
  amountCents: number
  occurredAt: Date
  // Parcela k de N: a data (occurredAt) é a da compra, mas cada parcela cai num mês (03-regras-negocio §
  // Compras parceladas: "cada parcela conta no mês em que o banco a lança").
  installment: { number: number; total: number } | null
  categoryId: string | null
  categoryName: string | null
  merchant: string | null
  personId: string | null
  personName: string | null
  splits: { personId: string; personName: string; amountCents: number }[]
}

const NO_CATEGORY_KEY = 'sem-categoria'
const NO_MERCHANT_KEY = 'sem-estabelecimento'
const NO_PERSON_KEY = 'sem-pessoa'

// "Acima do normal" (03-regras-negocio § Relatórios e insights): gasto > 140% da média dos 3 meses.
const ABOVE_NORMAL_PERCENT = 140

interface Bucket {
  label: string
  amountCents: number
}

// Aproximação: a 1ª parcela cai no mês da compra e cada seguinte um mês depois (o banco não dá a data de
// lançamento por parcela). Compra à vista fica no mês da própria data.
export function effectiveMonthKey(row: Pick<SpendingRow, 'occurredAt' | 'installment'>): string {
  const purchaseMonth = monthKey(row.occurredAt)
  return row.installment ? shiftMonthKey(purchaseMonth, row.installment.number - 1) : purchaseMonth
}

// Agrupa as linhas pelos meses pedidos. Com `throughDay`, compra à vista só conta até esse dia do mês
// (mesmo período dos meses de comparação); parcela conta inteira, porque o dia em que o banco a lança não é
// conhecido.
export function bucketByMonth(
  rows: SpendingRow[],
  months: string[],
  throughDay: number | null,
): Map<string, SpendingRow[]> {
  const buckets = new Map<string, SpendingRow[]>(months.map((month) => [month, []]))
  for (const row of rows) {
    const bucket = buckets.get(effectiveMonthKey(row))
    if (!bucket) continue
    if (throughDay !== null && !row.installment && dayOfMonth(row.occurredAt) > throughDay) continue
    bucket.push(row)
  }
  return buckets
}

// Meses (dos pedidos) que têm qualquer lançamento — base do "mínimo de 3 meses de histórico".
export function monthsWithRows(rows: SpendingRow[], months: string[]): Set<string> {
  const wanted = new Set(months)
  const present = new Set<string>()
  for (const row of rows) {
    const month = effectiveMonthKey(row)
    if (wanted.has(month)) present.add(month)
  }
  return present
}

function sign(row: Pick<SpendingRow, 'kind'>): 1 | -1 {
  return row.kind === 'REFUND' ? -1 : 1
}

// Fatia do dono, igual à fatura (computeInvoice): dividida = só a fatia dele; sem divisão, tudo ou nada pela
// pessoa da transação. REFUND reduz, nunca é uma linha à parte.
export function selfShareCents(
  row: Pick<SpendingRow, 'kind' | 'amountCents' | 'personId' | 'splits'>,
  selfPersonId: string,
): number {
  const share =
    row.splits.length > 0
      ? (row.splits.find((split) => split.personId === selfPersonId)?.amountCents ?? 0)
      : row.personId === selfPersonId
        ? row.amountCents
        : 0
  return sign(row) * share
}

function add(buckets: Map<string, Bucket>, key: string, label: string, cents: number): void {
  const bucket = buckets.get(key) ?? { label, amountCents: 0 }
  bucket.amountCents += cents
  buckets.set(key, bucket)
}

export function totalCents(rows: SpendingRow[], selfPersonId: string): number {
  return rows.reduce((sum, row) => sum + selfShareCents(row, selfPersonId), 0)
}

// Só a parte do dono; quem não gastou nada aqui (tudo de terceiros) não vira um grupo zerado.
export function sumByCategory(rows: SpendingRow[], selfPersonId: string): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const share = selfShareCents(row, selfPersonId)
    if (share === 0) continue
    const key = row.categoryId ?? NO_CATEGORY_KEY
    const label = row.categoryId ? (row.categoryName ?? '') : 'Sem categoria'
    add(buckets, key, label, share)
  }
  return buckets
}

// Mesma normalização da regra "sempre para este estabelecimento" (rule/normalize-merchant), senão "Loja
// X" e "loja x " viram grupos diferentes. O label mostrado é o merchant como veio (primeira ocorrência).
export function sumByMerchant(rows: SpendingRow[], selfPersonId: string): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const share = selfShareCents(row, selfPersonId)
    if (share === 0) continue
    const key = row.merchant ? normalizeMerchant(row.merchant) : NO_MERCHANT_KEY
    const label = row.merchant ?? 'Sem estabelecimento'
    add(buckets, key, label, share)
  }
  return buckets
}

// Todas as pessoas: é a visão de "quem gastou". Dividida: cada fatia vai pra pessoa dela, nunca a
// transação inteira pra uma só.
export function sumByPerson(rows: SpendingRow[]): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    if (row.splits.length > 0) {
      for (const split of row.splits) {
        add(buckets, split.personId, split.personName, sign(row) * split.amountCents)
      }
      continue
    }
    const key = row.personId ?? NO_PERSON_KEY
    const label = row.personId ? (row.personName ?? '') : 'Sem pessoa'
    add(buckets, key, label, sign(row) * row.amountCents)
  }
  return buckets
}

// null sem base de comparação (mês/média zerada) — percentual inventado a partir de 0 não informa nada.
function variationPercent(current: number, baseline: number): number | null {
  if (baseline === 0) return null
  return Math.round(((current - baseline) / baseline) * 100)
}

function averageAt(months: Map<string, Bucket>[], key: string): number {
  const sum = months.reduce((total, month) => total + (month.get(key)?.amountCents ?? 0), 0)
  return Math.round(sum / months.length)
}

interface BreakdownOptions {
  // Só a lista por categoria sinaliza "acima do normal" (03-regras-negocio); precisa dos 3 meses com dado.
  flagAboveNormal: boolean
  hasFullHistory: boolean
}

// Só entra no relatório quem gastou no mês pedido — meses anteriores sem esse grupo não geram uma linha
// zerada, e compra anulada por estorno (líquido zero) também não aparece. Ordenado do maior gasto pro menor
// (03-regras-negocio § Relatórios e insights).
export function buildBreakdown(
  current: Map<string, Bucket>,
  previous: Map<string, Bucket>,
  last3Months: Map<string, Bucket>[],
  options: BreakdownOptions = { flagAboveNormal: false, hasFullHistory: false },
): SpendingBreakdownItem[] {
  const items = [...current.entries()]
    .filter(([, bucket]) => bucket.amountCents !== 0)
    .map(([key, bucket]) => {
      const previousMonthCents = previous.get(key)?.amountCents ?? 0
      const averageLast3MonthsCents = averageAt(last3Months, key)
      return {
        key,
        label: bucket.label,
        amountCents: bucket.amountCents,
        previousMonthCents,
        vsPreviousMonthPercent: variationPercent(bucket.amountCents, previousMonthCents),
        averageLast3MonthsCents,
        vsAverageLast3MonthsPercent: variationPercent(bucket.amountCents, averageLast3MonthsCents),
        aboveNormal:
          options.flagAboveNormal &&
          options.hasFullHistory &&
          averageLast3MonthsCents > 0 &&
          bucket.amountCents * 100 > averageLast3MonthsCents * ABOVE_NORMAL_PERCENT,
      }
    })
  return items.sort((a, b) => b.amountCents - a.amountCents)
}
