import type { FixedExpense as FixedExpenseRow } from '@prisma/client'
import { NotFoundError } from '../../common/errors/domain.error'
import { FixedExpenseService } from './fixed-expense.service'
import type { FixedExpenseRepository } from './fixed-expense.repository'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    archive: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<FixedExpenseRepository>
}

function row(overrides: Partial<FixedExpenseRow> = {}): FixedExpenseRow {
  return {
    id: 'fe-1',
    userId: 'user-1',
    name: 'Aluguel',
    amountCents: 120000,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('FixedExpenseService', () => {
  it('create: devolve o DTO', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new FixedExpenseService(repo)

    await expect(service.create('user-1', { name: 'Aluguel', amountCents: 120000 })).resolves.toEqual({
      id: 'fe-1',
      name: 'Aluguel',
      amountCents: 120000,
      archivedAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    })
    expect(repo.create).toHaveBeenCalledWith('user-1', 'Aluguel', 120000)
  })

  it('list: mapeia todas as linhas', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row(), row({ id: 'fe-2', name: 'Internet', amountCents: 10000 })])
    const service = new FixedExpenseService(repo)

    const result = await service.list('user-1', false)

    expect(result).toHaveLength(2)
    expect(repo.findMany).toHaveBeenCalledWith('user-1', false)
  })

  it('sumActiveCents: soma só os ativos', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row({ amountCents: 120000 }), row({ id: 'fe-2', amountCents: 10000 })])
    const service = new FixedExpenseService(repo)

    await expect(service.sumActiveCents('user-1')).resolves.toBe(130000)
    expect(repo.findMany).toHaveBeenCalledWith('user-1', false)
  })

  it('sumActiveCents: sem nenhum gasto fixo, zero', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([])
    const service = new FixedExpenseService(repo)

    await expect(service.sumActiveCents('user-1')).resolves.toBe(0)
  })

  it('archive: 404 quando não existe (ou é de outro usuário)', async () => {
    const repo = repoMock()
    repo.archive.mockResolvedValue({ count: 0 })
    const service = new FixedExpenseService(repo)

    await expect(service.archive('user-1', 'fe-1')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('archive: sucesso não lança', async () => {
    const repo = repoMock()
    repo.archive.mockResolvedValue({ count: 1 })
    const service = new FixedExpenseService(repo)

    await expect(service.archive('user-1', 'fe-1')).resolves.toBeUndefined()
  })

  it('update: grava nome, valor e devolve o DTO', async () => {
    const repo = repoMock()
    repo.update.mockResolvedValue({ count: 1 })
    repo.findById.mockResolvedValue(row({ amountCents: 130000 }))
    const service = new FixedExpenseService(repo)

    const result = await service.update('user-1', 'fe-1', { name: 'Aluguel', amountCents: 130000 })

    expect(repo.update).toHaveBeenCalledWith('user-1', 'fe-1', { name: 'Aluguel', amountCents: 130000 })
    expect(result).toMatchObject({ id: 'fe-1', amountCents: 130000 })
  })

  it('update: gasto de outro usuário ou inexistente é 404 e nada é lido', async () => {
    const repo = repoMock()
    repo.update.mockResolvedValue({ count: 0 })
    const service = new FixedExpenseService(repo)

    await expect(service.update('user-2', 'fe-1', { name: 'Aluguel', amountCents: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(repo.findById).not.toHaveBeenCalled()
  })
})
