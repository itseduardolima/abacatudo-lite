import { DomainError } from '../../common/errors/domain.error'
import { MovementService } from './movement.service'
import type { AccountRepository } from '../account/account.repository'
import type { MovementRepository } from './movement.repository'

function accountsMock() {
  return { findById: jest.fn() } as unknown as jest.Mocked<AccountRepository>
}

function repoMock() {
  return { findMany: jest.fn(), totals: jest.fn() } as unknown as jest.Mocked<MovementRepository>
}

describe('MovementService', () => {
  describe('listByMonth', () => {
    it('devolve o que a Repository trouxer (débito, Pix, TED... nunca cartão)', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([])
      const service = new MovementService(repo, accountsMock())

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
      const service = new MovementService(repo, accountsMock())

      await expect(service.listByMonth('user-1', { month: 'setembro' })).rejects.toBeInstanceOf(DomainError)
      expect(repo.findMany).not.toHaveBeenCalled()
    })

    it('repassa conta, direção e busca pra Repository', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([])
      const service = new MovementService(repo, accountsMock())

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
      const service = new MovementService(repo, accountsMock())

      await expect(service.listByMonth('user-1', { direction: 'LATERAL' })).rejects.toBeInstanceOf(DomainError)
      expect(repo.findMany).not.toHaveBeenCalled()
    })
  })

  describe('totals', () => {
    it('devolve os totais do mês, "não entram no orçamento"', async () => {
      const repo = repoMock()
      repo.totals.mockResolvedValue({ incomeCents: 50000, expenseCents: 32000 })
      const service = new MovementService(repo, accountsMock())

      const result = await service.totals('user-1', '2026-09')

      expect(repo.totals).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
      expect(result).toEqual({ incomeCents: 50000, expenseCents: 32000 })
    })
  })

  describe('conta de benefício: resumo e Pix por favorecido', () => {
    function account(overrides: Record<string, unknown> = {}) {
      return {
        id: 'acc-benefit',
        userId: 'user-1',
        type: 'CHECKING',
        balanceCents: 30000,
        pluggyItem: { lastSyncAt: new Date('2026-09-30T13:00:00.000Z'), status: 'UPDATED' },
        ...overrides,
      } as unknown as Awaited<ReturnType<AccountRepository['findById']>>
    }

    function movementRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 'tx-1',
        accountId: 'acc-benefit',
        userId: 'user-1',
        kind: 'EXPENSE',
        status: 'POSTED',
        amountCents: 1000,
        occurredAt: new Date('2026-09-10T15:00:00.000Z'),
        description: 'Pix Ana Souza',
        merchant: null,
        categoryId: null,
        categorySuggestedId: null,
        categorySuggestionConfidence: null,
        personId: null,
        note: null,
        cardLast4: null,
        installmentNumber: null,
        installmentTotal: null,
        installmentDueAt: null,
        displayName: null,
        billId: null,
        externalId: 'ext-1',
        createdAt: new Date('2026-09-10T15:00:00.000Z'),
        updatedAt: new Date('2026-09-10T15:00:00.000Z'),
        ...overrides,
      } as never
    }

    it('report: 400 sem accountId, 404 de outro usuário e 422 em cartão de crédito, sem tocar nas movimentações', async () => {
      const repo = repoMock()
      const accounts = accountsMock()
      const service = new MovementService(repo, accounts)

      await expect(service.report('user-1', undefined, '2026-09')).rejects.toMatchObject({
        code: 'ACCOUNT_ID_REQUIRED',
      })

      accounts.findById.mockResolvedValue(null)
      await expect(service.report('user-2', 'acc-do-user-1', '2026-09')).rejects.toMatchObject({
        code: 'ACCOUNT_NOT_FOUND',
      })
      expect(accounts.findById).toHaveBeenCalledWith('user-2', 'acc-do-user-1')

      accounts.findById.mockResolvedValue(account({ type: 'CREDIT_CARD' }))
      await expect(service.report('user-1', 'acc-card', '2026-09')).rejects.toMatchObject({
        code: 'NOT_A_MOVEMENT_ACCOUNT',
      })
      expect(repo.findMany).not.toHaveBeenCalled()
    })

    it('report da conta de benefício: o período vai do dia 30 do mês anterior até o dia 29, com entrada de 30/09 em outubro', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([movementRow({ kind: 'INCOME', amountCents: 150000 })])
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(account({ isBenefitAccount: true }))
      const service = new MovementService(repo, accounts)

      const result = await service.report('user-1', 'acc-benefit', '2026-10')

      expect(repo.findMany).toHaveBeenCalledWith(
        'user-1',
        { start: new Date('2026-09-30T04:00:00.000Z'), end: new Date('2026-10-30T04:00:00.000Z') },
        { accountId: 'acc-benefit' },
      )
      expect(result.incomeCents).toBe(150000)
      expect(result.daily).toHaveLength(30)
      expect(result.daily[0]?.day).toBe('2026-09-30')
      expect(result.daily.at(-1)?.day).toBe('2026-10-29')
    })

    it('report: devolve saldo, última sincronização e os totais do mês da conta pedida', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([
        movementRow({ kind: 'INCOME', amountCents: 5000 }),
        movementRow({ amountCents: 2000 }),
      ])
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(account())
      const service = new MovementService(repo, accounts)

      const result = await service.report('user-1', 'acc-benefit', '2026-08')

      expect(repo.findMany).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        { accountId: 'acc-benefit' },
      )
      expect(result).toMatchObject({
        accountId: 'acc-benefit',
        month: '2026-08',
        balanceCents: 30000,
        lastSyncAt: '2026-09-30T13:00:00.000Z',
        incomeCents: 5000,
        expenseCents: 2000,
        resultCents: 3000,
        pace: null,
      })
      expect(result.daily).toHaveLength(31)
    })

    it('pixRecipients: agrupa só Pix enviados da conta e soma o total', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([
        movementRow({ description: 'Pix Ana Souza', amountCents: 1000 }),
        movementRow({ description: 'Pix ana souza', amountCents: 2500 }),
        movementRow({ description: 'Pix Bruno Lima', amountCents: 700 }),
      ])
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(account())
      const service = new MovementService(repo, accounts)

      const result = await service.pixRecipients('user-1', 'acc-benefit', '2026-09')

      expect(repo.findMany).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        { accountId: 'acc-benefit', direction: 'OUT' },
      )
      expect(result.totalCents).toBe(4200)
      expect(result.recipients.map((r) => [r.name, r.totalCents, r.count])).toEqual([
        ['Ana Souza', 3500, 2],
        ['Bruno Lima', 700, 1],
      ])
    })

    it('spending: soma por estabelecimento e bate com as saídas do relatório do mesmo mês', async () => {
      const repo = repoMock()
      const monthRows = [
        movementRow({ description: 'UBER DO BRASIL', amountCents: 1500 }),
        movementRow({ description: 'UBER DO BRASIL', amountCents: 2500 }),
        movementRow({ description: 'Pix Ana Souza', amountCents: 1000 }),
      ]
      repo.findMany.mockResolvedValue(monthRows)
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(account())
      const service = new MovementService(repo, accounts)

      const spending = await service.spending('user-1', 'acc-benefit', '2026-08')
      const report = await service.report('user-1', 'acc-benefit', '2026-08')

      expect(repo.findMany).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        { accountId: 'acc-benefit', direction: 'OUT' },
      )
      expect(spending).toMatchObject({ month: '2026-08', totalCents: 5000, pixCents: 1000 })
      expect(spending.establishments.map((e) => [e.label, e.totalCents])).toEqual([['UBER DO BRASIL', 4000]])
      expect(spending.totalCents).toBe(report.expenseCents)
    })

    it('spending: conta de outro usuário é 404, sem ler movimentações', async () => {
      const repo = repoMock()
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const service = new MovementService(repo, accounts)

      await expect(service.spending('user-2', 'acc-do-user-1', '2026-09')).rejects.toMatchObject({
        code: 'ACCOUNT_NOT_FOUND',
      })
      expect(repo.findMany).not.toHaveBeenCalled()
    })

    describe('habits', () => {
      beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-09-30T15:00:00.000Z')))
      afterEach(() => jest.useRealTimers())

      it('404 de outro usuário, sem ler movimentações', async () => {
        const repo = repoMock()
        const accounts = accountsMock()
        accounts.findById.mockResolvedValue(null)
        const service = new MovementService(repo, accounts)

        await expect(service.habits('user-2', 'acc-do-user-1', '2026-09')).rejects.toMatchObject({
          code: 'ACCOUNT_NOT_FOUND',
        })
        expect(repo.findMany).not.toHaveBeenCalled()
      })

      it('recorrentes pelo detector do cartão (sem Pix) e mais frequentes do mês', async () => {
        const repo = repoMock()
        const disney = (id: string, at: string) =>
          movementRow({
            id,
            description: 'THE WALT DISNEY COMPANY (BRASIL) LTDA',
            amountCents: 3495,
            occurredAt: new Date(at),
          })
        const pix = (id: string, at: string) =>
          movementRow({ id, description: 'Pix Eduardo Lima Castro', amountCents: 1000, occurredAt: new Date(at) })
        const windowRows = [
          disney('d1', '2026-07-13T12:00:00.000Z'),
          disney('d2', '2026-08-13T12:00:00.000Z'),
          disney('d3', '2026-09-13T12:00:00.000Z'),
          pix('p1', '2026-07-10T12:00:00.000Z'),
          pix('p2', '2026-08-10T12:00:00.000Z'),
          pix('p3', '2026-09-10T12:00:00.000Z'),
        ]
        const monthRows = [
          movementRow({ description: 'UBER DO BRASIL', amountCents: 1500 }),
          movementRow({ description: 'UBER DO BRASIL', amountCents: 2500 }),
          movementRow({ description: 'Pix Eduardo Lima Castro', amountCents: 1000 }),
          movementRow({ description: 'Pix Eduardo Lima Castro', amountCents: 1000 }),
        ]
        repo.findMany.mockResolvedValueOnce(monthRows).mockResolvedValueOnce(windowRows)
        const accounts = accountsMock()
        accounts.findById.mockResolvedValue(account())
        const service = new MovementService(repo, accounts)

        const result = await service.habits('user-1', 'acc-benefit', '2026-09')

        expect(repo.findMany).toHaveBeenCalledTimes(2)
        expect(repo.findMany).toHaveBeenCalledWith(
          'user-1',
          { start: expect.any(Date), end: expect.any(Date) },
          { accountId: 'acc-benefit', direction: 'OUT' },
        )
        expect(result.recurring.items.map((item) => [item.label, item.monthlyCents, item.occurrences])).toEqual([
          ['THE WALT DISNEY COMPANY (BRASIL) LTDA', 3495, 3],
        ])
        expect(result.frequent.map((item) => [item.label, item.count, item.totalCents])).toEqual([
          ['UBER DO BRASIL', 2, 4000],
        ])
      })
    })

    it('pixTransactions: exige o favorecido e devolve só os Pix dele', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([
        movementRow({ id: 'a', description: 'Pix Ana Souza' }),
        movementRow({ id: 'b', description: 'Pix Bruno Lima' }),
      ])
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(account())
      const service = new MovementService(repo, accounts)

      await expect(service.pixTransactions('user-1', 'acc-benefit', undefined, '2026-09')).rejects.toMatchObject({
        code: 'RECIPIENT_REQUIRED',
      })
      const result = await service.pixTransactions('user-1', 'acc-benefit', 'ana souza', '2026-09')

      expect(result.map((tx) => tx.id)).toEqual(['a'])
    })
  })
})
