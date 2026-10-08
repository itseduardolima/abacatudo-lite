import type { PrismaService } from '../../prisma/prisma.client'
import { BankingSyncRepository } from './banking-sync.repository'

function transactionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row',
    userId: 'user-1',
    personId: null,
    categoryId: null,
    note: null,
    occurredAt: new Date('2026-09-30T18:33:06.490Z'),
    amountCents: 54646,
    splits: [],
    ...overrides,
  }
}

function fakePrisma() {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    split: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    transaction: { update: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}) },
  }
  const transaction = { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() }
  const prisma = {
    transaction,
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
  } as unknown as PrismaService
  return { prisma, tx, transaction }
}

describe('BankingSyncRepository.mergeSettledPending', () => {
  const twins = [{ pendingId: 'pending-1', postedId: 'posted-1' }]

  it('passa pessoa, categoria, nota e rateio da pendente pra lançada e apaga a pendente', async () => {
    const { prisma, tx, transaction } = fakePrisma()
    transaction.findUnique
      .mockResolvedValueOnce(
        transactionRow({ id: 'p', personId: 'maria', categoryId: 'cat', note: 'nota', splits: [{ id: 's1' }] }),
      )
      .mockResolvedValueOnce(transactionRow({ id: 'q', personId: 'self' }))

    await new BankingSyncRepository(prisma).mergeSettledPending('user-1', 'acc-1', twins)

    expect(tx.split.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', transactionId: 'p' },
      data: { transactionId: 'q' },
    })
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'q' },
      data: { personId: 'maria', categoryId: 'cat', note: 'nota' },
    })
    expect(tx.transaction.delete).toHaveBeenCalledWith({ where: { id: 'p' } })
  })

  it('não move rateio quando a lançada já tem o dela', async () => {
    const { prisma, tx, transaction } = fakePrisma()
    transaction.findUnique
      .mockResolvedValueOnce(transactionRow({ id: 'p', splits: [{ id: 's1' }] }))
      .mockResolvedValueOnce(transactionRow({ id: 'q', splits: [{ id: 's2' }] }))

    await new BankingSyncRepository(prisma).mergeSettledPending('user-1', 'acc-1', twins)

    expect(tx.split.updateMany).not.toHaveBeenCalled()
    expect(tx.transaction.delete).toHaveBeenCalledWith({ where: { id: 'p' } })
  })

  it('linha de outro usuário nunca é mesclada nem apagada', async () => {
    const { prisma, tx, transaction } = fakePrisma()
    transaction.findUnique
      .mockResolvedValueOnce(transactionRow({ id: 'p', userId: 'user-2' }))
      .mockResolvedValueOnce(transactionRow({ id: 'q' }))

    await new BankingSyncRepository(prisma).mergeSettledPending('user-1', 'acc-1', twins)

    expect(tx.transaction.delete).not.toHaveBeenCalled()
  })

  it('sem a lançada no banco, a pendente fica', async () => {
    const { prisma, tx, transaction } = fakePrisma()
    transaction.findUnique.mockResolvedValueOnce(transactionRow({ id: 'p' })).mockResolvedValueOnce(null)

    await new BankingSyncRepository(prisma).mergeSettledPending('user-1', 'acc-1', twins)

    expect(tx.transaction.delete).not.toHaveBeenCalled()
  })
})

describe('BankingSyncRepository.mergeOrphanPending', () => {
  it('pendente que o Pluggy parou de devolver e tem lançada equivalente é mesclada e apagada', async () => {
    const { prisma, tx, transaction } = fakePrisma()
    transaction.findMany.mockResolvedValue([transactionRow({ id: 'p', categoryId: 'cat' })])
    transaction.findFirst.mockResolvedValue(transactionRow({ id: 'q' }))

    await new BankingSyncRepository(prisma).mergeOrphanPending('user-1', 'acc-1', ['posted-1'])

    expect(transaction.findMany.mock.calls[0][0].where).toMatchObject({
      userId: 'user-1',
      kind: 'CARD_PAYMENT',
      status: 'PENDING',
      billId: null,
      externalId: { notIn: ['posted-1'] },
    })
    expect(transaction.findFirst.mock.calls[0][0].where).toMatchObject({
      status: 'POSTED',
      billId: { not: null },
      amountCents: 54646,
      occurredAt: { gte: new Date('2026-09-30T03:00:00.000Z'), lt: new Date('2026-10-01T03:00:00.000Z') },
      externalId: { in: ['posted-1'] },
    })
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'q' },
      data: { personId: null, categoryId: 'cat', note: null },
    })
    expect(tx.transaction.delete).toHaveBeenCalledWith({ where: { id: 'p' } })
  })

  it('pendente órfã sem lançada equivalente fica', async () => {
    const { prisma, tx, transaction } = fakePrisma()
    transaction.findMany.mockResolvedValue([transactionRow({ id: 'p' })])
    transaction.findFirst.mockResolvedValue(null)

    await new BankingSyncRepository(prisma).mergeOrphanPending('user-1', 'acc-1', ['posted-1'])

    expect(tx.transaction.delete).not.toHaveBeenCalled()
  })
})
