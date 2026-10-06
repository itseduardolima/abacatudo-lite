import { DomainError } from '../../common/errors/domain.error'
import { MovementService } from './movement.service'
import type { MovementRepository } from './movement.repository'

function repoMock() {
  return { findMany: jest.fn(), totals: jest.fn() } as unknown as jest.Mocked<MovementRepository>
}

describe('MovementService', () => {
  describe('listByMonth', () => {
    it('devolve o que a Repository trouxer (débito, Pix, TED... nunca cartão)', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([])
      const service = new MovementService(repo)

      const result = await service.listByMonth('user-1', { month: '2026-09' })

      expect(repo.findMany).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        { accountId: undefined, direction: undefined, search: undefined },
      )
      expect(result).toEqual([])
    })

    it('mês em formato inválido é rejeitado antes de tocar no banco', async () => {
      const repo = repoMock()
      const service = new MovementService(repo)

      await expect(service.listByMonth('user-1', { month: 'setembro' })).rejects.toBeInstanceOf(DomainError)
      expect(repo.findMany).not.toHaveBeenCalled()
    })

    it('repassa conta, direção e busca pra Repository', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([])
      const service = new MovementService(repo)

      await service.listByMonth('user-1', {
        month: '2026-09',
        accountId: 'acc-1',
        direction: 'IN',
        search: 'mercado',
      })

      expect(repo.findMany).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        { accountId: 'acc-1', direction: 'IN', search: 'mercado' },
      )
    })

    it('direção fora de IN/OUT é rejeitada antes de tocar no banco', async () => {
      const repo = repoMock()
      const service = new MovementService(repo)

      await expect(service.listByMonth('user-1', { direction: 'LATERAL' })).rejects.toBeInstanceOf(DomainError)
      expect(repo.findMany).not.toHaveBeenCalled()
    })
  })

  describe('totals', () => {
    it('devolve os totais do mês, "não entram no orçamento"', async () => {
      const repo = repoMock()
      repo.totals.mockResolvedValue({ incomeCents: 50000, expenseCents: 32000 })
      const service = new MovementService(repo)

      const result = await service.totals('user-1', '2026-09')

      expect(repo.totals).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
      expect(result).toEqual({ incomeCents: 50000, expenseCents: 32000 })
    })
  })
})
