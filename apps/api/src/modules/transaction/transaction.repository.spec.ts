import type { PrismaService } from '../../prisma/prisma.client'
import { InvoiceRepository } from '../invoice/invoice.repository'
import { isInOpenCycle, TransactionRepository } from './transaction.repository'

const NOW = new Date('2026-10-03T23:00:00.000Z')
const OCTOBER = { start: new Date('2026-10-01T04:00:00.000Z'), end: new Date('2026-11-01T04:00:00.000Z') }

function row(overrides: Partial<Parameters<typeof isInOpenCycle>[0]> = {}) {
  return {
    billId: null,
    status: 'POSTED' as const,
    occurredAt: new Date('2026-10-03T15:00:00.000Z'),
    installmentNumber: null,
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

  it('compra à vista pendente e sem fatura entra na fatura aberta mesmo antes do fechamento', () => {
    const pending = row({ status: 'PENDING', occurredAt: new Date('2026-09-26T23:30:00.000Z') })
    expect(isInOpenCycle(pending, OCTOBER, NOW)).toBe(true)
  })

  it('compra à vista pendente há mais de 7 dias não entra: o banco já a cobrou na fatura fechada', () => {
    const stale = row({ status: 'PENDING', occurredAt: new Date('2026-09-20T15:00:00.000Z') })
    expect(isInOpenCycle(stale, OCTOBER, NOW)).toBe(false)
  })

  it('parcela pendente antes do fechamento continua valendo pela data do vencimento', () => {
    const installment = row({
      status: 'PENDING',
      installmentNumber: 5,
      occurredAt: new Date('2026-06-25T15:00:00.000Z'),
      installmentDueAt: new Date('2026-09-26T15:00:00.000Z'),
    })
    expect(isInOpenCycle(installment, OCTOBER, NOW)).toBe(false)
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

describe('parcelas de compra cancelada fora dos meses futuros', () => {
  const MONTHS = [1, 2, 3].map((n) => ({
    start: new Date(Date.UTC(2026, 9 + n, 1, 4)),
    end: new Date(Date.UTC(2026, 10 + n, 1, 4)),
  }))

  it('a lista e os totais de previsão filtram cancelledAt null em cada mês +1..+3', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const aggregate = jest.fn().mockResolvedValue({ _max: { installmentDueAt: null } })
    const prisma = { transaction: { findMany, aggregate } } as unknown as PrismaService
    const transactions = new TransactionRepository(prisma)
    const invoices = new InvoiceRepository(prisma)

    for (const range of MONTHS) {
      await transactions.findForecast('user-1', range)
      await invoices.findForecastRows('user-1', 'acc-1', range)
      await invoices.findStatementForecastRows('user-1', 'acc-1', range)
    }
    await invoices.findLastInstallmentDueAt('user-1', 'acc-1')

    expect(findMany).toHaveBeenCalledTimes(9)
    for (const call of findMany.mock.calls) expect(call[0].where).toMatchObject({ cancelledAt: null })
    expect(aggregate.mock.calls[0][0].where).toMatchObject({ cancelledAt: null })
  })
})
