import type { PrismaService } from '../../prisma/prisma.client'
import { computeInvoice, keepNextDueInstallmentOnly } from './invoice.mapper'
import { InvoiceRepository } from './invoice.repository'

function fakePrisma() {
  const transaction = {
    findMany: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 0 }, _max: { installmentDueAt: null } }),
  }
  return { prisma: { transaction } as unknown as PrismaService, transaction }
}

const RANGE = { start: new Date('2026-10-01T04:00:00.000Z'), end: new Date('2026-11-01T04:00:00.000Z') }

describe('InvoiceRepository: compra cancelada fica fora da conta', () => {
  it.each([
    ['findRows', (repo: InvoiceRepository) => repo.findRows('user-1', RANGE)],
    ['findOpenRows', (repo: InvoiceRepository) => repo.findOpenRows('user-1')],
    ['findForecastRows', (repo: InvoiceRepository) => repo.findForecastRows('user-1', 'acc-1', RANGE)],
    ['findStatementOpenRows', (repo: InvoiceRepository) => repo.findStatementOpenRows('user-1', 'acc-1')],
    [
      'findStatementForecastRows',
      (repo: InvoiceRepository) => repo.findStatementForecastRows('user-1', 'acc-1', RANGE),
    ],
    [
      'findStatementCalendarRows',
      (repo: InvoiceRepository) => repo.findStatementCalendarRows('user-1', 'acc-1', RANGE),
    ],
  ])('%s filtra cancelledAt null', async (_name, call) => {
    const { prisma, transaction } = fakePrisma()
    await call(new InvoiceRepository(prisma))
    expect(transaction.findMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1', cancelledAt: null })
  })

  it('sumPaymentsSince e findLastInstallmentDueAt filtram cancelledAt null', async () => {
    const { prisma, transaction } = fakePrisma()
    const repo = new InvoiceRepository(prisma)
    await repo.sumPaymentsSince('user-1', 'acc-1', RANGE.start, 'bill-1')
    await repo.findLastInstallmentDueAt('user-1', 'acc-1')
    expect(transaction.aggregate.mock.calls[0][0].where).toMatchObject({ cancelledAt: null })
    expect(transaction.aggregate.mock.calls[1][0].where).toMatchObject({ cancelledAt: null })
  })
})

describe('InvoiceRepository: parcelas com descrição truncada', () => {
  const purchaseRow = (description: string, number: number, total: number, amountCents: number) => ({
    kind: 'EXPENSE',
    accountId: 'acc-1',
    description,
    occurredAt: new Date('2026-09-04T12:00:00.000Z'),
    amountCents,
    personId: 'self',
    splits: [],
    installmentNumber: number,
    installmentTotal: total,
  })

  it.each([
    [
      [
        purchaseRow('MERCADOLIVRE*PODEROSABLZ', 1, 10, 5336),
        purchaseRow('MERCADOLIVRE*PODE', 2, 10, 5334),
        purchaseRow('MERCADOLIVRE*PODE', 3, 10, 5334),
      ],
      5336,
    ],
    [
      [
        purchaseRow('MERCADOLIVRE*LHSHOOP', 1, 3, 1197),
        purchaseRow('MERCADOLIVRE*LHSH', 2, 3, 1195),
        purchaseRow('MERCADOLIVRE*LHSH', 3, 3, 1195),
      ],
      1197,
    ],
  ])('fatura aberta conta só a menor parcela uma vez', async (rows, expected) => {
    const { prisma, transaction } = fakePrisma()
    transaction.findMany.mockResolvedValue(rows)
    const open = await new InvoiceRepository(prisma).findOpenRows('user-1')
    expect(computeInvoice(keepNextDueInstallmentOnly(open), 'self').totalCents).toBe(expected)
  })
})
