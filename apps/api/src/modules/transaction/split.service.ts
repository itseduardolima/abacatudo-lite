import { Injectable } from '@nestjs/common'
import type { Transaction, SplitPreview, UpdateTransactionSplitInput } from '@gastos/shared'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { PersonRepository } from '../person/person.repository'
import { splitEqually } from '../split/split-equally'
import { SplitRepository } from '../split/split.repository'
import { toTransactionDto } from './transaction.mapper'
import { TransactionRepository } from './transaction.repository'

const NOT_FOUND = () => new NotFoundError('TRANSACTION_NOT_FOUND', 'Transação não encontrada.')

@Injectable()
export class SplitService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly people: PersonRepository,
    private readonly splits: SplitRepository,
  ) {}

  async preview(userId: string, transactionId: string, personIds: string[]): Promise<SplitPreview> {
    const transaction = await this.transactions.findById(userId, transactionId)
    if (!transaction) throw NOT_FOUND()
    this.assertNoDuplicates(personIds)
    await this.assertPeopleExist(userId, personIds)

    return { splits: splitEqually(transaction.amountCents, personIds) }
  }

  async replace(userId: string, transactionId: string, input: UpdateTransactionSplitInput): Promise<Transaction> {
    const transaction = await this.transactions.findById(userId, transactionId)
    if (!transaction) throw NOT_FOUND()

    const personIds = input.splits.map((split) => split.personId)
    this.assertNoDuplicates(personIds)
    await this.assertPeopleExist(userId, personIds)

    const sum = input.splits.reduce((total, split) => total + split.amountCents, 0)
    if (sum !== transaction.amountCents) {
      throw new DomainError(
        'SPLIT_DOES_NOT_MATCH_TOTAL',
        'A soma da divisão precisa fechar exatamente com o total da transação.',
        400,
        { totalCents: transaction.amountCents, sumCents: sum },
      )
    }

    await this.splits.replaceAll(userId, transactionId, input.splits)
    const updated = await this.transactions.findById(userId, transactionId)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated, updated.splits)
  }

  async clear(userId: string, transactionId: string): Promise<Transaction> {
    const transaction = await this.transactions.findById(userId, transactionId)
    if (!transaction) throw NOT_FOUND()

    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)

    await this.splits.setSinglePerson(userId, transactionId, self.id)
    const updated = await this.transactions.findById(userId, transactionId)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated, updated.splits)
  }

  private async assertPeopleExist(userId: string, personIds: string[]): Promise<void> {
    for (const personId of personIds) {
      const person = await this.people.findActiveById(userId, personId)
      if (!person) throw new NotFoundError('PERSON_NOT_FOUND', 'Pessoa não encontrada.')
    }
  }

  // Mesma checagem pro preview e pro replace — o preview nunca pode prometer uma divisão que o replace
  // recusaria depois.
  private assertNoDuplicates(personIds: string[]): void {
    if (new Set(personIds).size !== personIds.length) {
      throw new DomainError('DUPLICATE_PERSON_IN_SPLIT', 'Cada pessoa só pode aparecer uma vez na divisão.', 400)
    }
  }
}
