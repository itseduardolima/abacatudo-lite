import type { Person } from '@prisma/client'
import { monthRange } from '../../common/date/timezone'
import type { PersonRepository } from '../person/person.repository'
import { InsightRepository } from './insight.repository'
import { InsightService } from './insight.service'
import type { SpendingRow } from './insight.mapper'

const SELF = 'self-1'
const at = (date: string) => new Date(`${date}T15:00:00.000Z`)

function repoMock() {
  return {
    findRows: jest.fn().mockResolvedValue([]),
    findSubscriptionRows: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<InsightRepository>
}

function peopleMock(self: Partial<Person> | null = { id: SELF }) {
  return { findSelf: jest.fn().mockResolvedValue(self) } as unknown as jest.Mocked<PersonRepository>
}

function row(overrides: Partial<SpendingRow> = {}): SpendingRow {
  return {
    kind: 'EXPENSE',
    amountCents: 10000,
    occurredAt: at('2026-09-10'),
    installment: null,
    categoryId: 'cat-1',
    categoryName: 'Mercado',
    merchant: 'Loja X',
    personId: SELF,
    personName: 'Eu',
    splits: [],
    ...overrides,
  }
}

describe('InsightService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T15:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  describe('spendingReport', () => {
    it('rejeita mês em formato inválido', async () => {
      const service = new InsightService(repoMock(), peopleMock())
      await expect(service.spendingReport('user-1', '2026/09')).rejects.toThrow('Mês inválido')
    })

    it('500 quando a pessoa "Eu" não existe', async () => {
      const service = new InsightService(repoMock(), peopleMock(null))
      await expect(service.spendingReport('user-1', '2026-09')).rejects.toThrow('Pessoa "Eu" não encontrada.')
    })

    it('busca as linhas numa consulta só, do mês pedido', async () => {
      const repo = repoMock()
      const service = new InsightService(repo, peopleMock())

      await service.spendingReport('user-1', '2026-09')

      expect(repo.findRows).toHaveBeenCalledTimes(1)
      expect(repo.findRows).toHaveBeenCalledWith('user-1', '2026-09')
    })

    it('total e listas por categoria/estabelecimento são só a parte do dono; byPerson mostra todas', async () => {
      const repo = repoMock()
      repo.findRows.mockResolvedValue([
        row({ amountCents: 12000 }),
        row({ amountCents: 5000, personId: 'other-1', personName: 'Mãe' }),
      ])
      const service = new InsightService(repo, peopleMock())

      const result = await service.spendingReport('user-1', '2026-09')

      expect(result.totalCents).toBe(12000)
      expect(result.byCategory).toEqual([expect.objectContaining({ key: 'cat-1', amountCents: 12000 })])
      expect(result.byMerchant).toEqual([expect.objectContaining({ key: 'loja x', amountCents: 12000 })])
      expect(result.byPerson.map((item) => [item.key, item.amountCents])).toEqual([
        [SELF, 12000],
        ['other-1', 5000],
      ])
    })

    it('mês corrente: throughDay é hoje e os meses de comparação só contam até esse dia', async () => {
      const repo = repoMock()
      repo.findRows.mockResolvedValue([
        row({ amountCents: 20000 }),
        row({ amountCents: 4000, occurredAt: at('2026-08-15') }), // dentro do período (até o dia 21)
        row({ amountCents: 9000, occurredAt: at('2026-08-28') }), // depois do dia 21: fica de fora
      ])
      const service = new InsightService(repo, peopleMock())

      const result = await service.spendingReport('user-1', '2026-09')

      expect(result.throughDay).toBe(21)
      expect(result.byCategory[0]).toMatchObject({ amountCents: 20000, previousMonthCents: 4000 })
    })

    it('mês passado: throughDay é null e a comparação é de mês inteiro', async () => {
      const repo = repoMock()
      repo.findRows.mockResolvedValue([
        row({ amountCents: 20000, occurredAt: at('2026-07-10') }),
        row({ amountCents: 9000, occurredAt: at('2026-06-28') }),
      ])
      const service = new InsightService(repo, peopleMock())

      const result = await service.spendingReport('user-1', '2026-07')

      expect(result.throughDay).toBeNull()
      expect(result.byCategory[0]).toMatchObject({ amountCents: 20000, previousMonthCents: 9000 })
    })

    it('parcela conta no mês em que cai, não tudo no mês da compra', async () => {
      const repo = repoMock()
      const purchase = at('2026-08-10')
      repo.findRows.mockResolvedValue([
        row({ amountCents: 3000, occurredAt: purchase, installment: { number: 1, total: 3 } }),
        row({ amountCents: 3000, occurredAt: purchase, installment: { number: 2, total: 3 } }),
        row({ amountCents: 3000, occurredAt: purchase, installment: { number: 3, total: 3 } }),
      ])
      const service = new InsightService(repo, peopleMock())

      const result = await service.spendingReport('user-1', '2026-09')

      // Setembro só tem a parcela 2/3; a 1/3 é o "mês anterior"; a 3/3 é de outubro.
      expect(result.totalCents).toBe(3000)
      expect(result.byCategory[0]).toMatchObject({ amountCents: 3000, previousMonthCents: 3000 })
    })

    it('linha sem número de parcela é compra à vista: compra antiga fora dos 4 meses não entra', async () => {
      const repo = repoMock()
      // Vem da janela larga de parcelas (installmentTotal preenchido), mas sem installmentNumber o mapper a
      // trata como à vista, no mês da própria data — aqui bem antes dos 4 meses pedidos.
      repo.findRows.mockResolvedValue([
        row({ amountCents: 7000, occurredAt: at('2026-01-10'), installment: null }),
        row({ amountCents: 4000 }),
      ])
      const service = new InsightService(repo, peopleMock())

      const result = await service.spendingReport('user-1', '2026-09')

      expect(result.totalCents).toBe(4000)
      expect(result.byCategory[0]).toMatchObject({ amountCents: 4000, previousMonthCents: 0 })
    })

    describe('categoria acima do normal', () => {
      const history = (months: string[]) =>
        months.map((month) => row({ amountCents: 10000, occurredAt: at(`${month}-05`) }))

      it('sinaliza quando passa de 140% da média, com os 3 meses anteriores com dado', async () => {
        const repo = repoMock()
        repo.findRows.mockResolvedValue([row({ amountCents: 20000 }), ...history(['2026-08', '2026-07', '2026-06'])])
        const service = new InsightService(repo, peopleMock())

        const result = await service.spendingReport('user-1', '2026-09')

        expect(result.byCategory[0]?.aboveNormal).toBe(true)
      })

      it('não sinaliza sem os 3 meses de histórico', async () => {
        const repo = repoMock()
        repo.findRows.mockResolvedValue([row({ amountCents: 20000 }), ...history(['2026-08', '2026-07'])])
        const service = new InsightService(repo, peopleMock())

        const result = await service.spendingReport('user-1', '2026-09')

        expect(result.byCategory[0]?.aboveNormal).toBe(false)
      })

      it('estabelecimento e pessoa nunca sinalizam', async () => {
        const repo = repoMock()
        repo.findRows.mockResolvedValue([row({ amountCents: 20000 }), ...history(['2026-08', '2026-07', '2026-06'])])
        const service = new InsightService(repo, peopleMock())

        const result = await service.spendingReport('user-1', '2026-09')

        expect(result.byMerchant[0]?.aboveNormal).toBe(false)
        expect(result.byPerson[0]?.aboveNormal).toBe(false)
      })
    })
  })

  describe('subscriptions', () => {
    const monthlyCharge = (date: string) => ({
      kind: 'EXPENSE' as const,
      amountCents: 5590,
      occurredAt: at(date),
      merchant: 'Netflix',
      description: 'NETFLIX.COM',
      personId: SELF,
      splits: [],
    })

    it('busca desde 12 meses atrás e devolve as assinaturas detectadas', async () => {
      const repo = repoMock()
      repo.findSubscriptionRows.mockResolvedValue([
        monthlyCharge('2026-07-08'),
        monthlyCharge('2026-08-08'),
        monthlyCharge('2026-09-08'),
      ])
      const service = new InsightService(repo, peopleMock())

      const result = await service.subscriptions('user-1')

      expect(repo.findSubscriptionRows).toHaveBeenCalledWith('user-1', monthRange('2025-09').start)
      expect(result.items).toHaveLength(1)
      expect(result.totalMonthlyCents).toBe(5590)
      expect(result.totalYearlyCents).toBe(5590 * 12)
    })

    it('500 quando a pessoa "Eu" não existe', async () => {
      const service = new InsightService(repoMock(), peopleMock(null))
      await expect(service.subscriptions('user-1')).rejects.toThrow('Pessoa "Eu" não encontrada.')
    })
  })
})
