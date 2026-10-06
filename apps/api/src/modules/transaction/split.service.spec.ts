import type { Person as PersonRow, Transaction as TransactionRow } from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { PersonRepository } from '../person/person.repository'
import type { SplitRepository } from '../split/split.repository'
import { SplitService } from './split.service'
import type { TransactionRepository, TransactionWithSplits } from './transaction.repository'

function transactionsMock() {
  return { findById: jest.fn() } as unknown as jest.Mocked<TransactionRepository>
}

function peopleMock() {
  return { findActiveById: jest.fn(), findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function splitsMock() {
  return { replaceAll: jest.fn(), setSinglePerson: jest.fn() } as unknown as jest.Mocked<SplitRepository>
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
    amountCents: 1000,
    occurredAt: new Date('2026-09-21T12:00:00.000Z'),
    description: 'PAG*LOJA',
    merchant: null,
    categoryId: null,
    categorySuggestedId: null,
    categorySuggestionConfidence: null,
    personId: 'self-1',
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

describe('SplitService', () => {
  describe('preview', () => {
    it('404 quando a transação não existe (ou não é cartão)', async () => {
      const transactions = transactionsMock()
      transactions.findById.mockResolvedValue(null)
      const service = new SplitService(transactions, peopleMock(), splitsMock())

      await expect(service.preview('user-1', 'tx-1', ['p1', 'p2'])).rejects.toBeInstanceOf(NotFoundError)
    })

    it('404 quando alguma pessoa não existe', async () => {
      const transactions = transactionsMock()
      transactions.findById.mockResolvedValue(row())
      const people = peopleMock()
      people.findActiveById.mockResolvedValueOnce(personRow()).mockResolvedValueOnce(null)
      const service = new SplitService(transactions, people, splitsMock())

      await expect(service.preview('user-1', 'tx-1', ['p1', 'p2'])).rejects.toBeInstanceOf(NotFoundError)
    })

    it('rejeita pessoa duplicada — o preview nunca promete o que o replace recusaria depois', async () => {
      const transactions = transactionsMock()
      transactions.findById.mockResolvedValue(row({ amountCents: 1000 }))
      const service = new SplitService(transactions, peopleMock(), splitsMock())

      await expect(service.preview('user-1', 'tx-1', ['p1', 'p1'])).rejects.toBeInstanceOf(DomainError)
    })

    it('devolve a divisão igual calculada pela API (nunca pelo cliente)', async () => {
      const transactions = transactionsMock()
      transactions.findById.mockResolvedValue(row({ amountCents: 1000 }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const service = new SplitService(transactions, people, splitsMock())

      const result = await service.preview('user-1', 'tx-1', ['p1', 'p2', 'p3'])

      expect(result.splits.reduce((sum, s) => sum + s.amountCents, 0)).toBe(1000)
      expect(result.splits).toHaveLength(3)
    })
  })

  describe('replace', () => {
    it('rejeita pessoa duplicada na divisão', async () => {
      const transactions = transactionsMock()
      transactions.findById.mockResolvedValue(row({ amountCents: 1000 }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const splits = splitsMock()
      const service = new SplitService(transactions, people, splits)

      await expect(
        service.replace('user-1', 'tx-1', {
          splits: [
            { personId: 'p1', amountCents: 500 },
            { personId: 'p1', amountCents: 500 },
          ],
        }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(splits.replaceAll).not.toHaveBeenCalled()
    })

    it('rejeita quando a soma não fecha com o total', async () => {
      const transactions = transactionsMock()
      transactions.findById.mockResolvedValue(row({ amountCents: 1000 }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const splits = splitsMock()
      const service = new SplitService(transactions, people, splits)

      await expect(
        service.replace('user-1', 'tx-1', {
          splits: [
            { personId: 'p1', amountCents: 400 },
            { personId: 'p2', amountCents: 500 },
          ],
        }),
      ).rejects.toBeInstanceOf(DomainError)
      expect(splits.replaceAll).not.toHaveBeenCalled()
    })

    it('quando a soma fecha, grava os splits e devolve a transação (personId null)', async () => {
      const transactions = transactionsMock()
      transactions.findById
        .mockResolvedValueOnce(row({ amountCents: 1000, personId: 'self-1' }))
        .mockResolvedValueOnce(row({ amountCents: 1000, personId: null }))
      const people = peopleMock()
      people.findActiveById.mockResolvedValue(personRow())
      const splits = splitsMock()
      const service = new SplitService(transactions, people, splits)

      const input = {
        splits: [
          { personId: 'self-1', amountCents: 500 },
          { personId: 'person-2', amountCents: 500 },
        ],
      }
      const result = await service.replace('user-1', 'tx-1', input)

      expect(splits.replaceAll).toHaveBeenCalledWith('user-1', 'tx-1', input.splits)
      expect(result.personId).toBeNull()
    })
  })

  describe('clear', () => {
    it('desfaz a divisão e devolve a transação pro self', async () => {
      const transactions = transactionsMock()
      transactions.findById
        .mockResolvedValueOnce(row({ personId: null }))
        .mockResolvedValueOnce(row({ personId: 'self-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow({ id: 'self-1', isSelf: true }))
      const splits = splitsMock()
      const service = new SplitService(transactions, people, splits)

      const result = await service.clear('user-1', 'tx-1')

      expect(splits.setSinglePerson).toHaveBeenCalledWith('user-1', 'tx-1', 'self-1')
      expect(result.personId).toBe('self-1')
    })
  })
})
