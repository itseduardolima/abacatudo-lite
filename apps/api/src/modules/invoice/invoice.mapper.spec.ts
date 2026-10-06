import {
  advancePaidCents,
  applyAdvancePayment,
  computeInvoice,
  keepNextDueInstallmentOnly,
  mergeInvoices,
  type InvoiceRow,
} from './invoice.mapper'

const SELF = 'self-1'
const FAMILY = 'family-1'

function row(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return { kind: 'EXPENSE', amountCents: 1000, personId: SELF, splits: [], installment: null, ...overrides }
}

describe('computeInvoice', () => {
  it('tudo meu: total = meu, não é meu = 0', () => {
    const result = computeInvoice([row({ amountCents: 1000 }), row({ amountCents: 500 })], SELF)
    expect(result).toEqual({ totalCents: 1500, mineCents: 1500, notMineCents: 0 })
  })

  it('gasto de outra pessoa não conta pra "meu", mas entra no total', () => {
    const result = computeInvoice(
      [row({ amountCents: 1000, personId: SELF }), row({ amountCents: 700, personId: FAMILY })],
      SELF,
    )
    expect(result).toEqual({ totalCents: 1700, mineCents: 1000, notMineCents: 700 })
  })

  it('estorno (REFUND) reduz o total e a fatia de quem tinha a compra', () => {
    const result = computeInvoice(
      [
        row({ kind: 'EXPENSE', amountCents: 1000, personId: SELF }),
        row({ kind: 'REFUND', amountCents: 300, personId: SELF }),
      ],
      SELF,
    )
    expect(result).toEqual({ totalCents: 700, mineCents: 700, notMineCents: 0 })
  })

  it('split conta só a fatia do self pra "meu", mesmo sem personId', () => {
    const result = computeInvoice(
      [
        row({
          amountCents: 1000,
          personId: null,
          splits: [
            { personId: SELF, amountCents: 400 },
            { personId: FAMILY, amountCents: 600 },
          ],
        }),
      ],
      SELF,
    )
    expect(result).toEqual({ totalCents: 1000, mineCents: 400, notMineCents: 600 })
  })

  it('invariante Fatura = Meu + Não é meu, sempre', () => {
    const rows: InvoiceRow[] = [
      row({ amountCents: 1000, personId: SELF }),
      row({ amountCents: 700, personId: FAMILY }),
      row({ kind: 'REFUND', amountCents: 200, personId: SELF }),
      row({
        amountCents: 900,
        personId: null,
        splits: [
          { personId: SELF, amountCents: 300 },
          { personId: FAMILY, amountCents: 600 },
        ],
      }),
    ]
    const result = computeInvoice(rows, SELF)
    expect(result.totalCents).toBe(result.mineCents + result.notMineCents)
  })

  it('sem linhas, tudo zero', () => {
    expect(computeInvoice([], SELF)).toEqual({ totalCents: 0, mineCents: 0, notMineCents: 0 })
  })

  it('CARD_PAYMENT (pagamento antecipado) abate o total e o "meu" juntos', () => {
    const result = computeInvoice(
      [
        row({ kind: 'EXPENSE', amountCents: 1000, personId: SELF }),
        row({ kind: 'CARD_PAYMENT', amountCents: 400, personId: SELF }),
      ],
      SELF,
    )
    expect(result).toEqual({ totalCents: 600, mineCents: 600, notMineCents: 0 })
  })

  it('CARD_PAYMENT nunca mexe no "não é meu" de terceiros', () => {
    const result = computeInvoice(
      [
        row({ kind: 'EXPENSE', amountCents: 1000, personId: SELF }),
        row({ kind: 'EXPENSE', amountCents: 700, personId: FAMILY }),
        row({ kind: 'CARD_PAYMENT', amountCents: 400, personId: SELF }),
      ],
      SELF,
    )
    expect(result).toEqual({ totalCents: 1300, mineCents: 600, notMineCents: 700 })
  })
})

describe('keepNextDueInstallmentOnly', () => {
  it('compra parcelada: mantém só a parcela de menor número, descarta as futuras', () => {
    const rows: InvoiceRow[] = [
      row({ amountCents: 100, installment: { groupKey: 'compra-1', number: 3 } }),
      row({ amountCents: 100, installment: { groupKey: 'compra-1', number: 4 } }),
      row({ amountCents: 100, installment: { groupKey: 'compra-1', number: 5 } }),
    ]
    const result = keepNextDueInstallmentOnly(rows)
    expect(result).toHaveLength(1)
    expect(result[0]!.installment).toEqual({ groupKey: 'compra-1', number: 3 })
  })

  it('grupos diferentes não se misturam', () => {
    const rows: InvoiceRow[] = [
      row({ amountCents: 100, installment: { groupKey: 'compra-a', number: 2 } }),
      row({ amountCents: 200, installment: { groupKey: 'compra-b', number: 1 } }),
    ]
    const result = keepNextDueInstallmentOnly(rows)
    expect(result).toHaveLength(2)
  })

  it('linha sem installment (compra normal, pagamento) sempre passa direto', () => {
    const rows: InvoiceRow[] = [row({ kind: 'CARD_PAYMENT', amountCents: 500, installment: null })]
    expect(keepNextDueInstallmentOnly(rows)).toEqual(rows)
  })

  it('sem linhas, sem linhas', () => {
    expect(keepNextDueInstallmentOnly([])).toEqual([])
  })
})

describe('mergeInvoices', () => {
  it('soma cada campo de várias faturas', () => {
    const result = mergeInvoices([
      { totalCents: 1000, mineCents: 700, notMineCents: 300 },
      { totalCents: 500, mineCents: 500, notMineCents: 0 },
    ])
    expect(result).toEqual({ totalCents: 1500, mineCents: 1200, notMineCents: 300 })
  })

  it('sem faturas, tudo zero', () => {
    expect(mergeInvoices([])).toEqual({ totalCents: 0, mineCents: 0, notMineCents: 0 })
  })
})

describe('advancePaidCents', () => {
  it('o pagamento quita primeiro a fatura fechada; só a sobra abate a aberta (caso real do Nubank)', () => {
    expect(advancePaidCents(76709, 66397)).toBe(10312)
  })

  it('pagamento que não passa da fatura fechada não abate a aberta', () => {
    expect(advancePaidCents(50000, 66397)).toBe(0)
  })

  it('sem o total da fatura fechada, não abate nada (não dá pra saber o que é adiantamento)', () => {
    expect(advancePaidCents(76709, null)).toBe(0)
  })
})

describe('applyAdvancePayment', () => {
  it('o abatimento sai do "meu", o "não é meu" fica, e Fatura = Meu + Não é meu continua valendo', () => {
    const result = applyAdvancePayment({ totalCents: 155504, mineCents: 100000, notMineCents: 55504 }, 10312)
    expect(result).toEqual({ totalCents: 145192, mineCents: 89688, notMineCents: 55504 })
    expect(result.mineCents + result.notMineCents).toBe(result.totalCents)
  })
})
