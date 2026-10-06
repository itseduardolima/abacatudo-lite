import type {
  Account as AccountRow,
  Category as CategoryRow,
  Person as PersonRow,
  Transaction as TransactionRow,
} from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository, AccountWithPluggyItem } from '../account/account.repository'
import type { CardHolderHintRepository } from '../card-holder-hint/card-holder-hint.repository'
import type { CategoryRepository } from '../category/category.repository'
import type { PersonRepository } from '../person/person.repository'
import type { RuleRepository } from '../rule/rule.repository'
import type { SplitRepository } from '../split/split.repository'
import { TransactionService } from './transaction.service'
import type { TransactionRepository, TransactionWithSplits } from './transaction.repository'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findForecast: jest.fn(),
    findPurchaseCandidates: jest.fn(),
    updateDisplayName: jest.fn(),
    findById: jest.fn(),
    updateCategory: jest.fn(),
  } as unknown as jest.Mocked<TransactionRepository>
}

function accountsMock() {
  return { findById: jest.fn() } as unknown as jest.Mocked<AccountRepository>
}

function peopleMock() {
  return { findActiveById: jest.fn(), findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function categoriesMock() {
  return { findActiveById: jest.fn() } as unknown as jest.Mocked<CategoryRepository>
}

function rulesMock() {
  return { upsertPerson: jest.fn(), upsertCategory: jest.fn() } as unknown as jest.Mocked<RuleRepository>
}

function cardHolderHintsMock() {
  return { upsertPerson: jest.fn() } as unknown as jest.Mocked<CardHolderHintRepository>
}

function splitsMock() {
  return { setSinglePerson: jest.fn() } as unknown as jest.Mocked<SplitRepository>
}

function row(
  overrides: Partial<TransactionRow> = {},
  splits: { personId: string; amountCents: number }[] = [],
): TransactionWithSplits {
  return {
    id: 'tx-1',
    userId: 'user-1',
    accountId: 'acc-1',
    externalId: 'ext-1',
    kind: 'EXPENSE',
    status: 'POSTED',
    amountCents: 1500,
    occurredAt: new Date('2026-09-21T12:00:00.000Z'),
    description: 'PAG*LOJA',
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
    createdAt: new Date('2026-09-21T12:00:00.000Z'),
    updatedAt: new Date('2026-09-21T12:00:00.000Z'),
    ...overrides,
    splits,
  }
}

function personRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'person-2',
    userId: 'user-1',
    name: 'Família',
    isSelf: false,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function categoryRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Mercado',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountWithPluggyItem {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Carteira',
    type: 'CASH',
    source: 'MANUAL',
    closingDay: null,
    dueDay: null,
    creditLimitCents: null,
    balanceCents: null,
    isBenefitAccount: false,
    bankLogo: null,
    pluggyItemId: null,
    externalAccountId: null,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    pluggyItem: null,
    ...overrides,
  }
}

function newService(
  overrides: {
    repo?: jest.Mocked<TransactionRepository>
    people?: jest.Mocked<PersonRepository>
    categories?: jest.Mocked<CategoryRepository>
    rules?: jest.Mocked<RuleRepository>
    splits?: jest.Mocked<SplitRepository>
    cardHolderHints?: jest.Mocked<CardHolderHintRepository>
    accounts?: jest.Mocked<AccountRepository>
  } = {},
) {
  return new TransactionService(
    overrides.repo ?? repoMock(),
    overrides.people ?? peopleMock(),
    overrides.categories ?? categoriesMock(),
    overrides.rules ?? rulesMock(),
    overrides.splits ?? splitsMock(),
    overrides.cardHolderHints ?? cardHolderHintsMock(),
    overrides.accounts ?? accountsMock(),
  )
}

describe('TransactionService', () => {
  describe('create', () => {
    it('404 quando a conta não é do usuário', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const service = newService({ accounts })

      await expect(
        service.create('user-1', {
          accountId: 'acc-de-outro',
          kind: 'EXPENSE',
          amountCents: 1000,
          occurredAt: '2026-09-21',
          description: 'Compra',
        }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('rejeita lançamento manual numa conta PLUGGY (só o sync escreve nela)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY' }))
      const repo = repoMock()
      const service = newService({ accounts, repo })

      await expect(
        service.create('user-1', {
          accountId: 'acc-1',
          kind: 'EXPENSE',
          amountCents: 1000,
          occurredAt: '2026-09-21',
          description: 'Compra',
        }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('rejeita categoryId/personId fora de cartão de crédito', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CASH' }))
      const repo = repoMock()
      const service = newService({ accounts, repo })

      await expect(
        service.create('user-1', {
          accountId: 'acc-1',
          kind: 'EXPENSE',
          amountCents: 1000,
          occurredAt: '2026-09-21',
          description: 'Compra',
          personId: 'person-2',
        }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('fora de cartão, cria sem categoria/pessoa (sempre null, igual o sync)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CASH' }))
      const repo = repoMock()
      repo.create.mockResolvedValue(row({ accountId: 'acc-1', personId: null, categoryId: null }))
      const service = newService({ accounts, repo })

      await service.create('user-1', {
        accountId: 'acc-1',
        kind: 'INCOME',
        amountCents: 5000,
        occurredAt: '2026-09-21',
        description: 'Pix recebido',
      })

      expect(repo.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ personId: null, categoryId: null, kind: 'INCOME' }),
      )
    })

    it('em cartão, sem personId informado cai no padrão "Meu" (self)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CREDIT_CARD' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow({ id: 'self-1', isSelf: true }))
      const repo = repoMock()
      repo.create.mockResolvedValue(row({ personId: 'self-1' }))
      const service = newService({ accounts, people, repo })

      await service.create('user-1', {
        accountId: 'acc-1',
        kind: 'EXPENSE',
        amountCents: 1000,
        occurredAt: '2026-09-21',
        description: 'Compra',
      })

      expect(repo.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ personId: 'self-1' }))
    })

    it('em cartão, com personId e categoryId válidos, usa os dois', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CREDIT_CARD' }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow({ id: 'person-2' }))
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(categoryRow({ id: 'cat-1' }))
      const repo = repoMock()
      repo.create.mockResolvedValue(row({ personId: 'person-2', categoryId: 'cat-1' }))
      const service = newService({ accounts, people, categories, repo })

      const result = await service.create('user-1', {
        accountId: 'acc-1',
        kind: 'EXPENSE',
        amountCents: 1000,
        occurredAt: '2026-09-21',
        description: 'Compra',
        personId: 'person-2',
        categoryId: 'cat-1',
      })

      expect(repo.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ personId: 'person-2', categoryId: 'cat-1', occurredAt: expect.any(Date) }),
      )
      expect(result.personId).toBe('person-2')
    })

    it('404 quando a categoria informada não existe (ou não é do usuário)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CREDIT_CARD' }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow({ id: 'person-2' }))
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(null)
      const repo = repoMock()
      const service = newService({ accounts, people, categories, repo })

      await expect(
        service.create('user-1', {
          accountId: 'acc-1',
          kind: 'EXPENSE',
          amountCents: 1000,
          occurredAt: '2026-09-21',
          description: 'Compra',
          personId: 'person-2',
          categoryId: 'cat-de-outro',
        }),
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  it('listByMonth: sem mês, usa o mês atual em America/Manaus', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'))
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = newService({ repo })

    const result = await service.listByMonth('user-1')

    expect(repo.findMany).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
    expect(result).toHaveLength(1)
    jest.useRealTimers()
  })

  it('listByMonth: mês futuro lista só as parcelas daquele mês, sem passar pelo filtro do mês corrente', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'))
    const repo = repoMock()
    repo.findForecast.mockResolvedValue([
      row({ installmentNumber: 2, installmentTotal: 6, installmentDueAt: new Date('2026-11-05T12:00:00.000Z') }),
    ])
    const service = newService({ repo })

    const result = await service.listByMonth('user-1', '2026-11')

    expect(repo.findForecast).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
    expect(repo.findMany).not.toHaveBeenCalled()
    expect(result[0]).toMatchObject({ installmentNumber: 2, installmentDueAt: '2026-11-05T12:00:00.000Z' })
    jest.useRealTimers()
  })

  it('listByMonth: o mês atual e os passados continuam no caminho de sempre', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'))
    const repo = repoMock()
    repo.findMany.mockResolvedValue([])
    const service = newService({ repo })

    await service.listByMonth('user-1', '2026-09')
    await service.listByMonth('user-1', '2026-08')

    expect(repo.findMany).toHaveBeenCalledTimes(2)
    expect(repo.findForecast).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('listByMonth: mês em formato inválido é rejeitado antes de tocar no banco', async () => {
    const repo = repoMock()
    const service = newService({ repo })

    await expect(service.listByMonth('user-1', '2026-13')).rejects.toBeInstanceOf(DomainError)
    expect(repo.findMany).not.toHaveBeenCalled()
  })

  describe('updateDisplayName', () => {
    it('404 quando a transação não é do usuário (ou não é cartão)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = newService({ repo })

      await expect(
        service.updateDisplayName('user-2', 'tx-do-user-1', { displayName: 'Air fryer' }),
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.updateDisplayName).not.toHaveBeenCalled()
    })

    it('compra à vista: só ela recebe o nome', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ id: 'tx-1' }))
      const service = newService({ repo })

      await service.updateDisplayName('user-1', 'tx-1', { displayName: 'Fogão' })

      expect(repo.findPurchaseCandidates).not.toHaveBeenCalled()
      expect(repo.updateDisplayName).toHaveBeenCalledWith('user-1', ['tx-1'], 'Fogão')
    })

    it('compra parcelada: todas as parcelas da mesma compra recebem o nome, e só elas', async () => {
      const occurredAt = new Date('2026-06-21T22:35:59.001Z')
      const repo = repoMock()
      repo.findById.mockResolvedValue(
        row({
          id: 'tx-3',
          description: 'Air fryer 3/12',
          occurredAt,
          installmentNumber: 3,
          installmentTotal: 12,
        }),
      )
      repo.findPurchaseCandidates.mockResolvedValue([
        { id: 'tx-3', description: 'Air fryer 3/12', occurredAt, installmentNumber: 3, installmentTotal: 12 },
        { id: 'tx-4', description: 'Air fryer 4/12', occurredAt, installmentNumber: 4, installmentTotal: 12 },
        { id: 'tx-12', description: 'Air fryer 12/12', occurredAt, installmentNumber: 12, installmentTotal: 12 },
        { id: 'outra', description: 'TV 1/12', occurredAt, installmentNumber: 1, installmentTotal: 12 },
      ])
      const service = newService({ repo })

      await service.updateDisplayName('user-1', 'tx-3', { displayName: 'Air fryer' })

      expect(repo.updateDisplayName).toHaveBeenCalledWith('user-1', ['tx-3', 'tx-4', 'tx-12'], 'Air fryer')
    })

    it('null limpa o nome e volta ao do banco', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ id: 'tx-1', displayName: 'Fogão' }))
      const service = newService({ repo })

      await service.updateDisplayName('user-1', 'tx-1', { displayName: null })

      expect(repo.updateDisplayName).toHaveBeenCalledWith('user-1', ['tx-1'], null)
    })
  })

  describe('updatePerson', () => {
    it('404 quando a transação não é do usuário (ou não é cartão)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = newService({ repo })

      await expect(
        service.updatePerson('user-1', 'tx-de-outro', {
          personId: 'person-2',
          alwaysForMerchant: false,
          alwaysForCard: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('404 quando a pessoa não existe (ou não é do usuário)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row())
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(null)
      const service = newService({ repo, people })

      await expect(
        service.updatePerson('user-1', 'tx-1', {
          personId: 'person-de-outro',
          alwaysForMerchant: false,
          alwaysForCard: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.findById).toHaveBeenCalledTimes(1)
    })

    it('troca a pessoa e desfaz split se tiver, atomicamente, devolve a transação atualizada', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ personId: 'person-2' }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const splits = splitsMock()
      const service = newService({ repo, people, splits })

      const result = await service.updatePerson('user-1', 'tx-1', {
        personId: 'person-2',
        alwaysForMerchant: false,
        alwaysForCard: false,
      })

      expect(splits.setSinglePerson).toHaveBeenCalledWith('user-1', 'tx-1', 'person-2')
      expect(result.personId).toBe('person-2')
    })

    it('alwaysForMerchant sem merchant na transação é rejeitado, sem criar Rule', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ merchant: null }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const rules = rulesMock()
      const splits = splitsMock()
      const service = newService({ repo, people, rules, splits })

      await expect(
        service.updatePerson('user-1', 'tx-1', { personId: 'person-2', alwaysForMerchant: true, alwaysForCard: false }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(rules.upsertPerson).not.toHaveBeenCalled()
      expect(splits.setSinglePerson).not.toHaveBeenCalled()
    })

    it('alwaysForMerchant cria/atualiza a Rule com o merchant normalizado', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ merchant: '  Loja da Família  ' }))
        .mockResolvedValueOnce(row({ merchant: '  Loja da Família  ', personId: 'person-2' }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const rules = rulesMock()
      const service = newService({ repo, people, rules })

      await service.updatePerson('user-1', 'tx-1', {
        personId: 'person-2',
        alwaysForMerchant: true,
        alwaysForCard: false,
      })

      expect(rules.upsertPerson).toHaveBeenCalledWith('user-1', 'loja da família', 'person-2')
    })

    it('alwaysForCard sem final de cartão na transação é rejeitado, sem criar CardHolderHint', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ cardLast4: null }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const cardHolderHints = cardHolderHintsMock()
      const splits = splitsMock()
      const service = newService({ repo, people, cardHolderHints, splits })

      await expect(
        service.updatePerson('user-1', 'tx-1', { personId: 'person-2', alwaysForMerchant: false, alwaysForCard: true }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(cardHolderHints.upsertPerson).not.toHaveBeenCalled()
      expect(splits.setSinglePerson).not.toHaveBeenCalled()
    })

    it('alwaysForCard cria/atualiza o CardHolderHint com a conta e o final do cartão da transação (2.3)', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ accountId: 'acc-1', cardLast4: '1234' }))
        .mockResolvedValueOnce(row({ accountId: 'acc-1', cardLast4: '1234', personId: 'person-2' }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const cardHolderHints = cardHolderHintsMock()
      const service = newService({ repo, people, cardHolderHints })

      await service.updatePerson('user-1', 'tx-1', {
        personId: 'person-2',
        alwaysForMerchant: false,
        alwaysForCard: true,
      })

      expect(cardHolderHints.upsertPerson).toHaveBeenCalledWith('user-1', 'acc-1', '1234', 'person-2')
    })

    it('alwaysForMerchant e alwaysForCard juntos criam a Rule e o CardHolderHint', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ merchant: 'Loja X', accountId: 'acc-1', cardLast4: '1234' }))
        .mockResolvedValueOnce(row({ merchant: 'Loja X', accountId: 'acc-1', cardLast4: '1234', personId: 'person-2' }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const rules = rulesMock()
      const cardHolderHints = cardHolderHintsMock()
      const service = newService({ repo, people, rules, cardHolderHints })

      await service.updatePerson('user-1', 'tx-1', {
        personId: 'person-2',
        alwaysForMerchant: true,
        alwaysForCard: true,
      })

      expect(rules.upsertPerson).toHaveBeenCalledWith('user-1', 'loja x', 'person-2')
      expect(cardHolderHints.upsertPerson).toHaveBeenCalledWith('user-1', 'acc-1', '1234', 'person-2')
    })
  })

  describe('updateCategory', () => {
    it('404 quando a transação não é do usuário (ou não é cartão)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = newService({ repo })

      await expect(
        service.updateCategory('user-1', 'tx-de-outro', { categoryId: 'cat-1', alwaysForMerchant: false }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('404 quando a categoria não existe (ou não é do usuário)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row())
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(null)
      const service = newService({ repo, categories })

      await expect(
        service.updateCategory('user-1', 'tx-1', { categoryId: 'cat-de-outro', alwaysForMerchant: false }),
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.updateCategory).not.toHaveBeenCalled()
    })

    it('troca a categoria e devolve a transação atualizada', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ categoryId: 'cat-1' }))
      repo.updateCategory.mockResolvedValue({ count: 1 })
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(categoryRow())
      const service = newService({ repo, categories })

      const result = await service.updateCategory('user-1', 'tx-1', {
        categoryId: 'cat-1',
        alwaysForMerchant: false,
      })

      expect(repo.updateCategory).toHaveBeenCalledWith('user-1', 'tx-1', 'cat-1')
      expect(result.categoryId).toBe('cat-1')
    })

    it('alwaysForMerchant sem merchant na transação é rejeitado, sem criar Rule', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ merchant: null }))
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(categoryRow())
      const rules = rulesMock()
      const service = newService({ repo, categories, rules })

      await expect(
        service.updateCategory('user-1', 'tx-1', { categoryId: 'cat-1', alwaysForMerchant: true }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(rules.upsertCategory).not.toHaveBeenCalled()
      expect(repo.updateCategory).not.toHaveBeenCalled()
    })

    it('alwaysForMerchant cria/atualiza a Rule com o merchant normalizado', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ merchant: '  Mercado Central  ' }))
        .mockResolvedValueOnce(row({ merchant: '  Mercado Central  ', categoryId: 'cat-1' }))
      repo.updateCategory.mockResolvedValue({ count: 1 })
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(categoryRow())
      const rules = rulesMock()
      const service = newService({ repo, categories, rules })

      await service.updateCategory('user-1', 'tx-1', { categoryId: 'cat-1', alwaysForMerchant: true })

      expect(rules.upsertCategory).toHaveBeenCalledWith('user-1', 'mercado central', 'cat-1')
    })
  })
})
