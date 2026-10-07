import type { Account as AccountRow, Person as PersonRow } from '@prisma/client'
import { lastClosingCutoff, monthKey, shiftMonthKey } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository, AccountWithPluggyItem } from '../account/account.repository'
import type { PluggyClient } from '../banking/pluggy/pluggy.client'
import type { PersonRepository } from '../person/person.repository'
import { InvoiceService } from './invoice.service'
import type { InvoiceRepository } from './invoice.repository'

function accountsMock() {
  return { findById: jest.fn(), findMany: jest.fn() } as unknown as jest.Mocked<AccountRepository>
}

function peopleMock() {
  return { findSelf: jest.fn(), findMany: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function repoMock() {
  return {
    findRows: jest.fn(),
    findOpenRows: jest.fn(),
    sumPaymentsSince: jest.fn().mockResolvedValue(0),
    findForecastRows: jest.fn(),
    findLastInstallmentDueAt: jest.fn(),
    findStatementOpenRows: jest.fn(),
    findStatementForecastRows: jest.fn(),
    findStatementCalendarRows: jest.fn(),
  } as unknown as jest.Mocked<InvoiceRepository>
}

function pluggyMock() {
  return { getLastClosedBill: jest.fn().mockResolvedValue(null) } as unknown as jest.Mocked<PluggyClient>
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountWithPluggyItem {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'MANUAL',
    closingDay: null,
    dueDay: null,
    creditLimitCents: null,
    bankLogo: null,
    pluggyItemId: null,
    externalAccountId: null,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
    pluggyItem: null,
  }
}

function personRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'self-1',
    userId: 'user-1',
    name: 'Eu',
    isSelf: true,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('InvoiceService', () => {
  describe('getForAccount', () => {
    it('400 sem accountId, antes de tocar no banco', async () => {
      const accounts = accountsMock()
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-1', undefined, '2026-09')).rejects.toBeInstanceOf(DomainError)
      expect(accounts.findById).not.toHaveBeenCalled()
    })

    it('404 quando a conta não existe (ou não é do usuário)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-09')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('422 quando a conta não é cartão de crédito', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CHECKING' }))
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-09')).rejects.toBeInstanceOf(DomainError)
    })

    it('conta MANUAL: calcula a fatura pelo mês calendário, nunca chama o Pluggy', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'MANUAL' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 1000, personId: 'self-1', splits: [], installment: null },
        { kind: 'EXPENSE', amountCents: 700, personId: 'family-1', splits: [], installment: null },
      ])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(repo.findRows).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) }, 'acc-1')
      expect(result).toMatchObject({ totalCents: 1700, mineCents: 1000, notMineCents: 700 })
    })

    it('conta PLUGGY: só a movimentação sem billId, só a próxima parcela de cada compra, sem fatura fechada', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 100000, personId: 'self-1', splits: [], installment: null },
        {
          kind: 'EXPENSE',
          amountCents: 5000,
          personId: 'self-1',
          splits: [],
          installment: { groupKey: 'compra-1', number: 3 },
        },
        {
          kind: 'EXPENSE',
          amountCents: 5000,
          personId: 'self-1',
          splits: [],
          installment: { groupKey: 'compra-1', number: 4 },
        },
      ])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(result).toMatchObject({ totalCents: 105000, mineCents: 105000, notMineCents: 0 })
    })

    it('conta PLUGGY com closingDay: só o que veio depois do último fechamento entra na fatura aberta', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', closingDay: 2 }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(repo.findOpenRows).toHaveBeenCalledWith('user-1', 'acc-1', lastClosingCutoff(2))
    })

    it('conta PLUGGY sem fatura fechada ainda (cartão novo): sem saldo anterior', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 5000, personId: 'self-1', splits: [], installment: null },
      ])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(result).toMatchObject({ totalCents: 5000, mineCents: 5000, notMineCents: 0 })
    })

    it('Pluggy indisponível: não derruba a tela, sem saldo anterior', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 5000, personId: 'self-1', splits: [], installment: null },
      ])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(result).toMatchObject({ totalCents: 5000, mineCents: 5000, notMineCents: 0 })
    })
  })

  describe('getForAccount — pagamento adiantado', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-03T23:00:00.000Z'))
    })
    afterEach(() => jest.useRealTimers())

    function setup(overrides: Partial<AccountRow>, payments: number, bill: number | null = null) {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(
        accountRow({
          source: 'PLUGGY',
          externalAccountId: 'ext-1',
          closingDay: 26,
          ...overrides,
        }),
      )
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 155504, personId: 'self-1', splits: [], installment: null },
      ])
      repo.sumPaymentsSince.mockResolvedValue(payments)
      const pluggy = pluggyMock()
      pluggy.getLastClosedBill.mockResolvedValue(
        bill === null ? null : { id: 'bill-1', dueDate: '2026-10-03', totalAmount: bill / 100 },
      )
      return { service: new InvoiceService(repo, accounts, people, pluggy), repo, pluggy }
    }

    it('sem valor informado, usa o total da última fatura fechada que o Pluggy manda', async () => {
      const { service, pluggy } = setup({}, 76709, 66397)

      const result = await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(pluggy.getLastClosedBill).toHaveBeenCalledWith('ext-1')
      expect(result.advancePaidCents).toBe(10312)
    })

    it('fatura do Pluggy que venceu antes do último fechamento é a do ciclo anterior: ignora, não abate', async () => {
      const { service, pluggy } = setup({}, 76709, 45440)
      pluggy.getLastClosedBill.mockResolvedValue({ id: 'bill-old', dueDate: '2026-09-13', totalAmount: 454.4 })

      const result = await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(result.advancePaidCents).toBe(0)
    })

    it('sem total da fatura fechada em lugar nenhum, não abate (BB e Pic Pay sem valor informado)', async () => {
      const { service } = setup({}, 76709, null)

      const result = await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(result).toMatchObject({ totalCents: 155504, advancePaidCents: 0 })
    })

    it('soma só pagamento sem fatura ou da fatura fechada: o de fatura anterior não é antecipado', async () => {
      const { service, repo } = setup({}, 0, 66397)

      const result = await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(result.advancePaidCents).toBe(0)
      expect(repo.sumPaymentsSince).toHaveBeenCalledWith('user-1', 'acc-1', expect.any(Date), 'bill-1')
    })

    it('a última fatura fechada do Pluggy é reaproveitada entre chamadas seguidas', async () => {
      const { service, pluggy } = setup({}, 76709, 66397)

      await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))
      await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(pluggy.getLastClosedBill).toHaveBeenCalledTimes(1)
    })

    it('sem data nem dia de fechamento, não há como saber o que veio depois: não abate', async () => {
      const { service, repo } = setup({ closingDay: null }, 76709, 66397)

      const result = await service.getForAccount('user-1', 'acc-1', monthKey(new Date()))

      expect(result.advancePaidCents).toBe(0)
      expect(repo.sumPaymentsSince).not.toHaveBeenCalled()
    })
  })

  describe('getForAccount — fatura prevista', () => {
    const currentMonth = monthKey(new Date())
    const futureMonth = shiftMonthKey(currentMonth, 2)

    it('conta PLUGGY em mês futuro: só as parcelas do mês, sem saldo anterior nem Pluggy, e Fatura = Meu + Não é meu', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findForecastRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 10000, personId: 'self-1', splits: [], installment: null },
        { kind: 'EXPENSE', amountCents: 6000, personId: 'family-1', splits: [], installment: null },
        {
          kind: 'EXPENSE',
          amountCents: 4000,
          personId: 'self-1',
          splits: [
            { personId: 'self-1', amountCents: 1000 },
            { personId: 'family-1', amountCents: 3000 },
          ],
          installment: null,
        },
      ])
      repo.findLastInstallmentDueAt.mockResolvedValue(new Date(`${shiftMonthKey(currentMonth, 5)}-15T12:00:00.000Z`))
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', futureMonth)

      expect(repo.findForecastRows).toHaveBeenCalledWith('user-1', 'acc-1', {
        start: expect.any(Date),
        end: expect.any(Date),
      })
      expect(repo.findOpenRows).not.toHaveBeenCalled()
      expect(result).toEqual({
        totalCents: 20000,
        mineCents: 11000,
        notMineCents: 9000,
        advancePaidCents: 0,
        isForecast: true,
        lastForecastMonth: shiftMonthKey(currentMonth, 5),
      })
      expect(result.totalCents).toBe(result.mineCents + result.notMineCents)
    })

    it('mês futuro sem nenhuma parcela: fatura zerada, sem inventar valor', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findForecastRows.mockResolvedValue([])
      repo.findLastInstallmentDueAt.mockResolvedValue(null)
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', futureMonth)).resolves.toEqual({
        totalCents: 0,
        mineCents: 0,
        notMineCents: 0,
        advancePaidCents: 0,
        isForecast: true,
        lastForecastMonth: null,
      })
    })

    it('mês atual (ou sem mês) não é previsão, mas informa até onde vai a previsão', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([])
      repo.findLastInstallmentDueAt.mockResolvedValue(new Date(`${shiftMonthKey(currentMonth, 3)}-10T12:00:00.000Z`))
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', currentMonth)

      expect(repo.findForecastRows).not.toHaveBeenCalled()
      expect(result).toMatchObject({ isForecast: false, lastForecastMonth: shiftMonthKey(currentMonth, 3) })
    })

    it('conta MANUAL nunca vira previsão nem consulta parcelas', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'MANUAL' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findRows.mockResolvedValue([])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', futureMonth)

      expect(repo.findForecastRows).not.toHaveBeenCalled()
      expect(repo.findLastInstallmentDueAt).not.toHaveBeenCalled()
      expect(result).toMatchObject({ isForecast: false, lastForecastMonth: null })
    })

    it('mês inválido em conta PLUGGY: 400 INVALID_MONTH', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const service = new InvoiceService(repoMock(), accounts, people, pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-13')).rejects.toMatchObject({
        code: 'INVALID_MONTH',
      })
    })

    it('dois usuários: cartão de outro usuário é 404 e nenhuma parcela dele é lida', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const repo = repoMock()
      const service = new InvoiceService(repo, accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-2', 'acc-do-user-1', futureMonth)).rejects.toBeInstanceOf(NotFoundError)
      expect(accounts.findById).toHaveBeenCalledWith('user-2', 'acc-do-user-1')
      expect(repo.findForecastRows).not.toHaveBeenCalled()
    })
  })

  describe('lastForecastMonth', () => {
    it('usa só o mês da última parcela real e é null sem parcelas', async () => {
      const run = async (last: Date | null) => {
        const accounts = accountsMock()
        accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY' }))
        const people = peopleMock()
        people.findSelf.mockResolvedValue(personRow())
        const repo = repoMock()
        repo.findOpenRows.mockResolvedValue([])
        repo.findLastInstallmentDueAt.mockResolvedValue(last)
        return new InvoiceService(repo, accounts, people, pluggyMock()).getForAccount('user-1', 'acc-1')
      }

      expect((await run(new Date('2027-03-17T12:00:00.000Z'))).lastForecastMonth).toBe('2027-03')
      expect((await run(null)).lastForecastMonth).toBeNull()
    })
  })

  describe('getStatements', () => {
    const currentMonth = monthKey(new Date())
    const futureMonth = shiftMonthKey(currentMonth, 2)
    const people = [
      personRow(),
      personRow({ id: 'ana', name: 'Ana', isSelf: false }),
      personRow({ id: 'bia', name: 'Bia', isSelf: false }),
    ]

    function statementRow(overrides: Record<string, unknown> = {}) {
      return {
        kind: 'EXPENSE' as const,
        amountCents: 1000,
        personId: 'ana',
        splits: [],
        installment: null,
        label: 'Compra',
        installmentNumber: null,
        installmentTotal: null,
        sortAt: new Date('2026-09-10T12:00:00.000Z'),
        ...overrides,
      }
    }

    it('mês atual em conta PLUGGY: fatura aberta, só a próxima parcela de cada compra, um texto por pessoa', async () => {
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([accountRow({ source: 'PLUGGY', name: 'Nubank gold', dueDay: 10 })])
      const peopleRepo = peopleMock()
      peopleRepo.findMany.mockResolvedValue(people)
      const repo = repoMock()
      repo.findStatementOpenRows.mockResolvedValue([
        statementRow({
          label: 'Air fryer',
          amountCents: 21204,
          installment: { groupKey: 'air', number: 3 },
          installmentNumber: 3,
          installmentTotal: 12,
        }),
        statementRow({
          label: 'Air fryer',
          amountCents: 21204,
          installment: { groupKey: 'air', number: 4 },
          installmentNumber: 4,
          installmentTotal: 12,
        }),
        statementRow({ personId: 'bia', label: 'Mercado', amountCents: 5000 }),
      ])
      const service = new InvoiceService(repo, accounts, peopleRepo, pluggyMock())

      const result = await service.getStatements('user-1')

      expect(result).toMatchObject({ month: currentMonth, isForecast: false })
      expect(result.statements.map((s) => [s.personName, s.totalCents])).toEqual([
        ['Ana', 21204],
        ['Bia', 5000],
      ])
      expect(result.statements[0]?.text).toContain('Air fryer: R$ 212,04 (3/12)')
      expect(result.statements[0]?.text).toContain('Pagar até dia 10')
      expect(result.statements[0]?.text).not.toContain('4/12')
      expect(repo.findStatementForecastRows).not.toHaveBeenCalled()
    })

    it('mês futuro em conta PLUGGY: usa as parcelas previstas e marca como previsão', async () => {
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([accountRow({ source: 'PLUGGY' })])
      const peopleRepo = peopleMock()
      peopleRepo.findMany.mockResolvedValue(people)
      const repo = repoMock()
      repo.findStatementForecastRows.mockResolvedValue([statementRow({ label: 'TV', amountCents: 34990 })])
      const service = new InvoiceService(repo, accounts, peopleRepo, pluggyMock())

      const result = await service.getStatements('user-1', futureMonth)

      expect(result).toMatchObject({ month: futureMonth, isForecast: true })
      expect(result.statements[0]?.text).toContain('(previsão)')
      expect(repo.findStatementOpenRows).not.toHaveBeenCalled()
    })

    it('conta MANUAL usa o mês calendário', async () => {
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([accountRow({ source: 'MANUAL' })])
      const peopleRepo = peopleMock()
      peopleRepo.findMany.mockResolvedValue(people)
      const repo = repoMock()
      repo.findStatementCalendarRows.mockResolvedValue([statementRow()])
      const service = new InvoiceService(repo, accounts, peopleRepo, pluggyMock())

      const result = await service.getStatements('user-1', currentMonth)

      expect(repo.findStatementCalendarRows).toHaveBeenCalledWith('user-1', 'acc-1', {
        start: expect.any(Date),
        end: expect.any(Date),
      })
      expect(result.statements).toHaveLength(1)
    })

    it('mês inválido: 400 INVALID_MONTH, sem tocar no banco', async () => {
      const accounts = accountsMock()
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getStatements('user-1', '2026-13')).rejects.toMatchObject({ code: 'INVALID_MONTH' })
      expect(accounts.findMany).not.toHaveBeenCalled()
    })

    it('dois usuários: as consultas de pessoas, contas e compras levam sempre o userId de quem pediu', async () => {
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([accountRow({ userId: 'user-2', source: 'PLUGGY' })])
      const peopleRepo = peopleMock()
      peopleRepo.findMany.mockResolvedValue([])
      const repo = repoMock()
      repo.findStatementOpenRows.mockResolvedValue([])
      const service = new InvoiceService(repo, accounts, peopleRepo, pluggyMock())

      const result = await service.getStatements('user-2')

      expect(peopleRepo.findMany).toHaveBeenCalledWith('user-2', true)
      expect(accounts.findMany).toHaveBeenCalledWith('user-2', false)
      expect(repo.findStatementOpenRows).toHaveBeenCalledWith('user-2', 'acc-1', undefined)
      expect(result.statements).toEqual([])
    })
  })

  describe('getSummary', () => {
    it('soma a fatura de todos os cartões, cada um com o critério certo pra sua fonte', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([
        accountRow({ id: 'acc-pluggy', source: 'PLUGGY', externalAccountId: 'ext-1' }),
        accountRow({ id: 'acc-manual', source: 'MANUAL' }),
        accountRow({ id: 'acc-checking', type: 'CHECKING', source: 'MANUAL' }),
      ])
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 58988, personId: 'self-1', splits: [], installment: null },
      ])
      repo.findRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 500, personId: 'self-1', splits: [], installment: null },
      ])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getSummary('user-1')

      expect(accounts.findMany).toHaveBeenCalledWith('user-1', false)
      expect(repo.findOpenRows).toHaveBeenCalledWith('user-1', 'acc-pluggy', undefined)
      expect(repo.findRows).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        'acc-manual',
      )
      expect(repo.findRows).not.toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        'acc-checking',
      )
      expect(result).toEqual({ totalCents: 59488, mineCents: 59488, notMineCents: 0 })
    })

    it('mês futuro: soma a fatura prevista dos cartões PLUGGY, sem saldo anterior nem o Pluggy', async () => {
      const futureMonth = shiftMonthKey(monthKey(new Date()), 1)
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([
        accountRow({ id: 'card-a', source: 'PLUGGY', externalAccountId: 'ext-a' }),
        accountRow({ id: 'card-b', source: 'PLUGGY', externalAccountId: 'ext-b' }),
      ])
      const repo = repoMock()
      repo.findForecastRows.mockImplementation(async (_userId, accountId) =>
        accountId === 'card-a'
          ? [{ kind: 'EXPENSE', amountCents: 10000, personId: 'self-1', splits: [], installment: null }]
          : [{ kind: 'EXPENSE', amountCents: 4000, personId: 'family-1', splits: [], installment: null }],
      )
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getSummary('user-1', futureMonth)

      expect(repo.findOpenRows).not.toHaveBeenCalled()
      expect(result).toEqual({ totalCents: 14000, mineCents: 10000, notMineCents: 4000 })
    })

    it('mês atual ou passado no summary continua sendo a fatura de agora', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([accountRow({ id: 'card-a', source: 'PLUGGY', externalAccountId: 'ext-a' })])
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      await service.getSummary('user-1', shiftMonthKey(monthKey(new Date()), -1))

      expect(repo.findForecastRows).not.toHaveBeenCalled()
      expect(repo.findOpenRows).toHaveBeenCalledWith('user-1', 'card-a', undefined)
    })

    it('sem Pessoa self, falha alto (invariante quebrada)', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accountsMock(), people, pluggyMock())

      await expect(service.getSummary('user-1')).rejects.toBeInstanceOf(DomainError)
    })
  })
})
