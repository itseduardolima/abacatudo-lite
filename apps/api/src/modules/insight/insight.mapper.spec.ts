import {
  bucketByMonth,
  buildBreakdown,
  effectiveMonthKey,
  monthsWithRows,
  sumByCategory,
  sumByMerchant,
  sumByPerson,
  totalCents,
} from './insight.mapper'
import type { SpendingRow } from './insight.mapper'

const SELF = 'self-1'

// Meio-dia em Manaus (UTC-4) cai no mesmo dia em UTC — sem surpresa de fuso nos testes.
const at = (date: string) => new Date(`${date}T15:00:00.000Z`)

function row(overrides: Partial<SpendingRow> = {}): SpendingRow {
  return {
    kind: 'EXPENSE',
    amountCents: 10000,
    occurredAt: at('2026-09-10'),
    installment: null,
    categoryId: 'cat-1',
    categoryName: 'Mercado',
    merchant: 'Loja X',
    personId: SELF,
    personName: 'Eu',
    splits: [],
    ...overrides,
  }
}

describe('insight.mapper', () => {
  describe('effectiveMonthKey', () => {
    it('compra à vista cai no mês da própria data', () => {
      expect(effectiveMonthKey(row({ occurredAt: at('2026-08-31') }))).toBe('2026-08')
    })

    it('parcela k de N cai (k − 1) meses depois do mês da compra, virando o ano', () => {
      const purchase = at('2025-11-20')
      expect(effectiveMonthKey(row({ occurredAt: purchase, installment: { number: 1, total: 4 } }))).toBe('2025-11')
      expect(effectiveMonthKey(row({ occurredAt: purchase, installment: { number: 3, total: 4 } }))).toBe('2026-01')
    })
  })

  describe('bucketByMonth', () => {
    const months = ['2026-09', '2026-08']

    it('ignora linhas de meses fora dos pedidos', () => {
      const buckets = bucketByMonth([row({ occurredAt: at('2026-05-10') })], months, null)
      expect(buckets.get('2026-09')).toEqual([])
      expect(buckets.get('2026-08')).toEqual([])
    })

    it('com throughDay, compra à vista depois desse dia fica de fora (mesmo período)', () => {
      const early = row({ occurredAt: at('2026-08-10') })
      const late = row({ occurredAt: at('2026-08-25') })
      const buckets = bucketByMonth([early, late], months, 21)
      expect(buckets.get('2026-08')).toEqual([early])
    })

    it('com throughDay, parcela conta inteira: o dia do lançamento pelo banco não é conhecido', () => {
      const installment = row({ occurredAt: at('2026-07-28'), installment: { number: 2, total: 3 } })
      const buckets = bucketByMonth([installment], months, 21)
      expect(buckets.get('2026-08')).toEqual([installment])
    })

    it('sem throughDay conta o mês inteiro', () => {
      const late = row({ occurredAt: at('2026-08-25') })
      expect(bucketByMonth([late], months, null).get('2026-08')).toEqual([late])
    })
  })

  describe('monthsWithRows', () => {
    it('devolve só os meses pedidos que têm algum lançamento', () => {
      const rows = [row({ occurredAt: at('2026-08-10') }), row({ occurredAt: at('2026-05-10') })]
      expect(monthsWithRows(rows, ['2026-08', '2026-07'])).toEqual(new Set(['2026-08']))
    })
  })

  describe('totalCents (só a parte do dono)', () => {
    it('soma EXPENSE do dono e subtrai REFUND', () => {
      const rows = [row({ amountCents: 10000 }), row({ kind: 'REFUND', amountCents: 3000 })]
      expect(totalCents(rows, SELF)).toBe(7000)
    })

    it('não conta gasto de outra pessoa', () => {
      const rows = [row({ amountCents: 10000 }), row({ amountCents: 5000, personId: 'other-1', personName: 'Mãe' })]
      expect(totalCents(rows, SELF)).toBe(10000)
    })

    it('transação dividida conta só a fatia do dono', () => {
      const rows = [
        row({
          amountCents: 10000,
          personId: null,
          splits: [
            { personId: SELF, personName: 'Eu', amountCents: 6000 },
            { personId: 'other-1', personName: 'Mãe', amountCents: 4000 },
          ],
        }),
      ]
      expect(totalCents(rows, SELF)).toBe(6000)
    })
  })

  describe('sumByCategory', () => {
    it('agrupa por categoryId, cai em "Sem categoria" quando nulo', () => {
      const rows = [
        row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 5000 }),
        row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 3000 }),
        row({ categoryId: null, categoryName: null, amountCents: 1000 }),
      ]
      const buckets = sumByCategory(rows, SELF)
      expect(buckets.get('cat-1')).toEqual({ label: 'Mercado', amountCents: 8000 })
      expect(buckets.get('sem-categoria')).toEqual({ label: 'Sem categoria', amountCents: 1000 })
    })

    it('categoria só com gasto de terceiros não vira grupo zerado', () => {
      const rows = [row({ categoryId: 'cat-9', categoryName: 'Lazer', personId: 'other-1', personName: 'Mãe' })]
      expect(sumByCategory(rows, SELF).size).toBe(0)
    })
  })

  describe('sumByMerchant', () => {
    it('normaliza (trim + lowercase) pra não separar "Loja X" de "loja x "', () => {
      const rows = [row({ merchant: 'Loja X', amountCents: 5000 }), row({ merchant: 'loja x ', amountCents: 3000 })]
      expect(sumByMerchant(rows, SELF).get('loja x')).toEqual({ label: 'Loja X', amountCents: 8000 })
    })

    it('cai em "Sem estabelecimento" quando nulo', () => {
      const buckets = sumByMerchant([row({ merchant: null, amountCents: 1000 })], SELF)
      expect(buckets.get('sem-estabelecimento')).toEqual({ label: 'Sem estabelecimento', amountCents: 1000 })
    })
  })

  describe('sumByPerson (todas as pessoas)', () => {
    it('sem split: tudo pra pessoa da transação', () => {
      const buckets = sumByPerson([row({ amountCents: 5000 })])
      expect(buckets.get(SELF)).toEqual({ label: 'Eu', amountCents: 5000 })
    })

    it('com split: cada fatia pra sua pessoa, nunca a transação inteira pra uma só', () => {
      const rows = [
        row({
          amountCents: 10000,
          splits: [
            { personId: SELF, personName: 'Eu', amountCents: 6000 },
            { personId: 'person-2', personName: 'Cônjuge', amountCents: 4000 },
          ],
        }),
      ]
      const buckets = sumByPerson(rows)
      expect(buckets.get(SELF)).toEqual({ label: 'Eu', amountCents: 6000 })
      expect(buckets.get('person-2')).toEqual({ label: 'Cônjuge', amountCents: 4000 })
    })

    it('REFUND com split reduz a fatia de cada pessoa (sinal aplicado antes do split)', () => {
      const rows = [
        row({ kind: 'REFUND', amountCents: 10000, splits: [{ personId: SELF, personName: 'Eu', amountCents: 10000 }] }),
      ]
      expect(sumByPerson(rows).get(SELF)).toEqual({ label: 'Eu', amountCents: -10000 })
    })
  })

  describe('buildBreakdown', () => {
    const cat = (amountCents: number, key = 'cat-1') =>
      sumByCategory([row({ categoryId: key, categoryName: 'Mercado', amountCents })], SELF)

    it('só inclui grupos com gasto no mês atual, ordenado do maior pro menor', () => {
      const current = sumByCategory(
        [
          row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 3000 }),
          row({ categoryId: 'cat-2', categoryName: 'Lazer', amountCents: 9000 }),
        ],
        SELF,
      )
      const previous = cat(500, 'cat-9')
      const items = buildBreakdown(current, previous, [previous, previous, previous])
      expect(items.map((i) => i.key)).toEqual(['cat-2', 'cat-1'])
    })

    it('grupo com compra anulada por estorno (líquido zero) não aparece', () => {
      const current = sumByMerchant(
        [
          row({ merchant: 'Uber', amountCents: 1800 }),
          row({ merchant: 'Uber', kind: 'REFUND', amountCents: 1800 }),
          row({ merchant: 'Loja X', amountCents: 500 }),
        ],
        SELF,
      )
      const empty = new Map()
      expect(buildBreakdown(current, empty, [empty, empty, empty]).map((i) => i.key)).toEqual(['loja x'])
    })

    it('vsPreviousMonthPercent é null quando o mês anterior é zero', () => {
      const empty = new Map()
      const items = buildBreakdown(cat(5000), empty, [empty, empty, empty])
      expect(items[0]).toMatchObject({ previousMonthCents: 0, vsPreviousMonthPercent: null })
    })

    it('calcula variação vs. mês anterior e média dos 3 meses anteriores', () => {
      const items = buildBreakdown(cat(12000), cat(10000), [cat(10000), cat(8000), cat(6000)])
      expect(items[0]).toMatchObject({
        vsPreviousMonthPercent: 20,
        averageLast3MonthsCents: 8000,
        vsAverageLast3MonthsPercent: 50,
      })
    })

    describe('aboveNormal', () => {
      const last3 = [cat(10000), cat(10000), cat(10000)] // média 10000
      const flagged = { flagAboveNormal: true, hasFullHistory: true }

      it('true quando o gasto passa de 140% da média, com histórico dos 3 meses', () => {
        expect(buildBreakdown(cat(14001), cat(10000), last3, flagged)[0]?.aboveNormal).toBe(true)
      })

      it('false exatamente em 140% (o limite é "mais que")', () => {
        expect(buildBreakdown(cat(14000), cat(10000), last3, flagged)[0]?.aboveNormal).toBe(false)
      })

      it('false sem histórico dos 3 meses', () => {
        const options = { flagAboveNormal: true, hasFullHistory: false }
        expect(buildBreakdown(cat(30000), cat(10000), last3, options)[0]?.aboveNormal).toBe(false)
      })

      it('false quando a lista não sinaliza (estabelecimento/pessoa)', () => {
        const options = { flagAboveNormal: false, hasFullHistory: true }
        expect(buildBreakdown(cat(30000), cat(10000), last3, options)[0]?.aboveNormal).toBe(false)
      })

      it('false quando a média é zero (categoria nova não é "acima do normal")', () => {
        const empty = new Map()
        expect(buildBreakdown(cat(30000), empty, [empty, empty, empty], flagged)[0]?.aboveNormal).toBe(false)
      })
    })
  })
})
