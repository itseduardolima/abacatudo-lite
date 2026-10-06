import { Injectable } from '@nestjs/common'
import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionCategoryInput,
  UpdateTransactionDisplayNameInput,
  UpdateTransactionPersonInput,
} from '@gastos/shared'
import { installmentGroupKey } from '../../common/installment-group'
import { dayFromDateString, monthKey, resolveMonthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository } from '../account/account.repository'
import { CardHolderHintRepository } from '../card-holder-hint/card-holder-hint.repository'
import { CategoryRepository } from '../category/category.repository'
import { PersonRepository } from '../person/person.repository'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { RuleRepository } from '../rule/rule.repository'
import { SplitRepository } from '../split/split.repository'
import { toTransactionDto } from './transaction.mapper'
import { TransactionRepository } from './transaction.repository'

const NOT_FOUND = () => new NotFoundError('TRANSACTION_NOT_FOUND', 'Transação não encontrada.')
const MERCHANT_REQUIRED_FOR_RULE = () =>
  new DomainError(
    'MERCHANT_REQUIRED_FOR_RULE',
    'Essa transação não tem estabelecimento identificado — não dá pra criar uma regra.',
    400,
  )
const CARD_REQUIRED_FOR_HINT = () =>
  new DomainError(
    'CARD_REQUIRED_FOR_HINT',
    'Essa transação não tem o final do cartão identificado — não dá pra lembrar desse cartão.',
    400,
  )

@Injectable()
export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly people: PersonRepository,
    private readonly categories: CategoryRepository,
    private readonly rules: RuleRepository,
    private readonly splits: SplitRepository,
    private readonly cardHolderHints: CardHolderHintRepository,
    private readonly accounts: AccountRepository,
  ) {}

  // Lançamento manual (3.3): só em conta MANUAL/IMPORT — a conta PLUGGY é escrita só pelo sync, nunca à
  // mão, senão o próximo sync não saberia se aquela linha já existe (não tem externalId pra casar).
  // categoria/pessoa só existem em cartão (03-regras-negocio § Escopo); fora de cartão, ficam sempre null,
  // como o sync já faz. Sem pessoa informada num cartão, cai no padrão "Meu" — mesma regra do sync.
  async create(userId: string, input: CreateTransactionInput): Promise<Transaction> {
    const account = await this.accounts.findById(userId, input.accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.source === 'PLUGGY') {
      throw new DomainError(
        'MANUAL_ENTRY_NOT_ALLOWED',
        'Essa conta sincroniza sozinha — não dá pra lançar à mão nela.',
        422,
      )
    }

    const isCreditCard = account.type === 'CREDIT_CARD'
    if (!isCreditCard && (input.categoryId !== undefined || input.personId !== undefined)) {
      throw new DomainError(
        'CATEGORY_PERSON_ONLY_ON_CARD',
        'Categoria e pessoa só existem em conta de cartão de crédito.',
        400,
      )
    }

    let personId: string | null = null
    let categoryId: string | null = null
    if (isCreditCard) {
      if (input.personId) {
        const person = await this.people.findActiveById(userId, input.personId)
        if (!person) throw new NotFoundError('PERSON_NOT_FOUND', 'Pessoa não encontrada.')
        personId = person.id
      } else {
        const self = await this.people.findSelf(userId)
        if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
        personId = self.id
      }

      if (input.categoryId) {
        const category = await this.categories.findActiveById(userId, input.categoryId)
        if (!category) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Categoria não encontrada.')
        categoryId = category.id
      }
    }

    const row = await this.repo.create(userId, {
      accountId: account.id,
      kind: input.kind,
      status: 'POSTED',
      amountCents: input.amountCents,
      occurredAt: dayFromDateString(input.occurredAt),
      description: input.description,
      personId,
      categoryId,
    })
    return toTransactionDto(row)
  }

  async listByMonth(userId: string, month?: string): Promise<Transaction[]> {
    const range = resolveMonthRange(month)
    const isFutureMonth = month !== undefined && month > monthKey(new Date())
    const rows = isFutureMonth ? await this.repo.findForecast(userId, range) : await this.repo.findMany(userId, range)
    return rows.map((row) => toTransactionDto(row, row.splits))
  }

  async updatePerson(userId: string, id: string, input: UpdateTransactionPersonInput): Promise<Transaction> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()

    const person = await this.people.findActiveById(userId, input.personId)
    if (!person) throw new NotFoundError('PERSON_NOT_FOUND', 'Pessoa não encontrada.')

    if (input.alwaysForMerchant) {
      if (!existing.merchant) throw MERCHANT_REQUIRED_FOR_RULE()
      await this.rules.upsertPerson(userId, normalizeMerchant(existing.merchant), input.personId)
    }

    if (input.alwaysForCard) {
      if (!existing.cardLast4) throw CARD_REQUIRED_FOR_HINT()
      await this.cardHolderHints.upsertPerson(userId, existing.accountId, existing.cardLast4, input.personId)
    }

    // Atômico: corrigir a pessoa direto também desfaz uma divisão, se tiver — nunca deixa split antigo
    // sobrar "escondido" depois que a pessoa foi trocada.
    await this.splits.setSinglePerson(userId, id, input.personId)

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated, updated.splits)
  }

  async updateCategory(userId: string, id: string, input: UpdateTransactionCategoryInput): Promise<Transaction> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()

    const category = await this.categories.findActiveById(userId, input.categoryId)
    if (!category) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Categoria não encontrada.')

    if (input.alwaysForMerchant) {
      if (!existing.merchant) throw MERCHANT_REQUIRED_FOR_RULE()
      await this.rules.upsertCategory(userId, normalizeMerchant(existing.merchant), input.categoryId)
    }

    const result = await this.repo.updateCategory(userId, id, input.categoryId)
    if (result.count === 0) throw NOT_FOUND()

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated, updated.splits)
  }

  // Nome na fatura vale pra compra inteira: todas as parcelas (inclusive as futuras, que já existem como
  // linha) recebem o mesmo apelido — pelo mesmo agrupamento que a fatura usa (installmentGroupKey).
  async updateDisplayName(userId: string, id: string, input: UpdateTransactionDisplayNameInput): Promise<Transaction> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()

    const ids = [id]
    if (existing.installmentNumber != null && existing.installmentTotal != null) {
      const groupKey = installmentGroupKey({
        description: existing.description,
        occurredAt: existing.occurredAt,
        installmentTotal: existing.installmentTotal,
        installmentNumber: existing.installmentNumber,
      })
      const candidates = await this.repo.findPurchaseCandidates(
        userId,
        existing.accountId,
        existing.occurredAt,
        existing.installmentTotal,
      )
      for (const candidate of candidates) {
        if (candidate.id === id || candidate.installmentTotal == null) continue
        const key = installmentGroupKey({
          description: candidate.description,
          occurredAt: candidate.occurredAt,
          installmentTotal: candidate.installmentTotal,
          installmentNumber: candidate.installmentNumber,
        })
        if (key === groupKey) ids.push(candidate.id)
      }
    }

    await this.repo.updateDisplayName(userId, ids, input.displayName)

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated, updated.splits)
  }
}
