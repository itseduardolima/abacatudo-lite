import { isInOpenCycle } from './transaction.repository'

const NOW = new Date('2026-10-03T23:00:00.000Z')
const OCTOBER = { start: new Date('2026-10-01T04:00:00.000Z'), end: new Date('2026-11-01T04:00:00.000Z') }

function row(overrides: Partial<Parameters<typeof isInOpenCycle>[0]> = {}) {
  return {
    billId: null,
    occurredAt: new Date('2026-10-03T15:00:00.000Z'),
    installmentDueAt: null,
    account: { closingDay: 27 },
    ...overrides,
  }
}

describe('isInOpenCycle', () => {
  it('compra depois do último fechamento (dia 27) está na fatura aberta', () => {
    expect(isInOpenCycle(row({ occurredAt: new Date('2026-09-29T15:00:00.000Z') }), OCTOBER, NOW)).toBe(true)
  })

  it('compra antes do fechamento e fora do mês é da fatura fechada', () => {
    expect(isInOpenCycle(row({ occurredAt: new Date('2026-09-20T15:00:00.000Z') }), OCTOBER, NOW)).toBe(false)
  })

  it('parcela comprada em agosto que vence em outubro está na fatura aberta (vale a data do vencimento)', () => {
    const installment = row({
      occurredAt: new Date('2026-08-03T15:00:00.000Z'),
      installmentDueAt: new Date('2026-10-03T15:00:00.000Z'),
    })
    expect(isInOpenCycle(installment, OCTOBER, NOW)).toBe(true)
  })

  it('parcela que venceu antes do fechamento é da fatura fechada', () => {
    const installment = row({
      occurredAt: new Date('2026-06-25T15:00:00.000Z'),
      installmentDueAt: new Date('2026-09-26T15:00:00.000Z'),
    })
    expect(isInOpenCycle(installment, OCTOBER, NOW)).toBe(false)
  })

  it('cartão sem closingDay ou com billId segue a regra de sempre', () => {
    expect(
      isInOpenCycle(
        row({ account: { closingDay: null }, occurredAt: new Date('2026-01-01T00:00:00.000Z') }),
        OCTOBER,
        NOW,
      ),
    ).toBe(true)
    expect(
      isInOpenCycle(row({ billId: 'bill-1', occurredAt: new Date('2026-01-01T00:00:00.000Z') }), OCTOBER, NOW),
    ).toBe(true)
  })
})
