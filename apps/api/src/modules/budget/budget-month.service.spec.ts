import type { BudgetMonth as BudgetMonthRow } from '@prisma/client'
import { DomainError } from '../../common/errors/domain.error'
import { BudgetMonthService } from './budget-month.service'
import type { BudgetMonthRepository } from './budget-month.repository'

function repoMock() {
  return {
    findByMonth: jest.fn(),
    findMostRecentBefore: jest.fn(),
    createIfMissing: jest.fn(),
    upsert: jest.fn(),
  } as unknown as jest.Mocked<BudgetMonthRepository>
}

function row(overrides: Partial<BudgetMonthRow> = {}): BudgetMonthRow {
  return {
    id: 'bm-1',
    userId: 'user-1',
    month: '2026-09',
    incomeCents: 500000,
    fixedExpensesCents: 200000,
    savingsGoalCents: 50000,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('BudgetMonthService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  describe('getOrCreate', () => {
    it('mês já configurado: devolve com o teto variável calculado', async () => {
      const repo = repoMock()
      repo.findByMonth.mockResolvedValue(row())
      const service = new BudgetMonthService(repo)

      const result = await service.getOrCreate('user-1', '2026-09')

      expect(result).toEqual({
        month: '2026-09',
        incomeCents: 500000,
        fixedExpensesCents: 200000,
        savingsGoalCents: 50000,
        variableCapCents: 250000,
      })
    })

    it('mês atual sem configuração: cria copiando o mês configurado mais recente', async () => {
      const repo = repoMock()
      repo.findByMonth.mockResolvedValue(null)
      repo.findMostRecentBefore.mockResolvedValue(row({ month: '2026-08' }))
      repo.createIfMissing.mockResolvedValue(row({ month: '2026-09' }))
      const service = new BudgetMonthService(repo)

      await service.getOrCreate('user-1', '2026-09')

      expect(repo.createIfMissing).toHaveBeenCalledWith('user-1', '2026-09', {
        incomeCents: 500000,
        fixedExpensesCents: 200000,
        savingsGoalCents: 50000,
      })
    })

    it('mês seguinte (planejar com antecedência) sem configuração: também cria copiando', async () => {
      const repo = repoMock()
      repo.findByMonth.mockResolvedValue(null)
      repo.findMostRecentBefore.mockResolvedValue(row({ month: '2026-09' }))
      repo.createIfMissing.mockResolvedValue(row({ month: '2026-10' }))
      const service = new BudgetMonthService(repo)

      await service.getOrCreate('user-1', '2026-10')

      expect(repo.createIfMissing).toHaveBeenCalledWith('user-1', '2026-10', expect.any(Object))
    })

    it('mês além do seguinte: projeta o mês configurado mais recente, sem gravar nada', async () => {
      const repo = repoMock()
      repo.findByMonth.mockResolvedValue(null)
      repo.findMostRecentBefore.mockResolvedValue(row({ month: '2026-10', incomeCents: 550000 }))
      const service = new BudgetMonthService(repo)

      const result = await service.getOrCreate('user-1', '2026-12')

      expect(result).toMatchObject({ month: '2026-12', incomeCents: 550000 })
      expect(repo.findMostRecentBefore).toHaveBeenCalledWith('user-1', '2026-12')
      expect(repo.createIfMissing).not.toHaveBeenCalled()
      expect(repo.upsert).not.toHaveBeenCalled()
    })

    it('mês além do seguinte sem nenhum mês configurado antes: zero, sem gravar nada', async () => {
      const repo = repoMock()
      repo.findByMonth.mockResolvedValue(null)
      repo.findMostRecentBefore.mockResolvedValue(null)
      const service = new BudgetMonthService(repo)

      const result = await service.getOrCreate('user-1', '2026-12')

      expect(result).toEqual({
        month: '2026-12',
        incomeCents: 0,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
        variableCapCents: 0,
      })
      expect(repo.createIfMissing).not.toHaveBeenCalled()
    })

    it('mês passado sem configuração: zero, sem gravar nada', async () => {
      const repo = repoMock()
      repo.findByMonth.mockResolvedValue(null)
      const service = new BudgetMonthService(repo)

      const result = await service.getOrCreate('user-1', '2026-01')

      expect(result).toEqual({
        month: '2026-01',
        incomeCents: 0,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
        variableCapCents: 0,
      })
      expect(repo.createIfMissing).not.toHaveBeenCalled()
      expect(repo.findMostRecentBefore).not.toHaveBeenCalled()
    })

    it('mês em formato inválido é rejeitado antes de tocar no banco', async () => {
      const repo = repoMock()
      const service = new BudgetMonthService(repo)

      await expect(service.getOrCreate('user-1', 'setembro')).rejects.toBeInstanceOf(DomainError)
      expect(repo.findByMonth).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('mês atual/futuro: grava', async () => {
      const repo = repoMock()
      repo.upsert.mockResolvedValue(row({ month: '2026-09', incomeCents: 600000 }))
      const service = new BudgetMonthService(repo)

      await service.update('user-1', '2026-09', {
        incomeCents: 565145,
        fixedExpensesCents: 200000,
        savingsGoalCents: 50000,
      })

      expect(repo.upsert).toHaveBeenCalledWith('user-1', '2026-09', {
        incomeCents: 565145,
        fixedExpensesCents: 200000,
        savingsGoalCents: 50000,
      })
    })

    it('mês fechado (passado) é rejeitado, nunca reescreve o histórico', async () => {
      const repo = repoMock()
      const service = new BudgetMonthService(repo)

      await expect(
        service.update('user-1', '2026-08', {
          incomeCents: 0,
          fixedExpensesCents: 0,
          savingsGoalCents: 0,
        }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(repo.upsert).not.toHaveBeenCalled()
    })
  })
})
