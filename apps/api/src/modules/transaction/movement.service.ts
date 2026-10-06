import { Injectable } from '@nestjs/common'
import type {
  MovementHabits,
  MovementReport,
  MovementSpending,
  MovementTotals,
  PixRecipientsResponse,
  Transaction,
} from '@gastos/shared'
import {
  BENEFIT_DEPOSIT_DAY,
  benefitPeriodRange,
  dateKey,
  dayOfMonth,
  monthKey,
  monthRange,
  resolveMonthRange,
  shiftMonthKey,
} from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository } from '../account/account.repository'
import { detectSubscriptions } from '../insight/subscription.mapper'
import {
  computeMovementReport,
  filterPixRowsByRecipient,
  frequentEstablishments,
  groupPixRecipients,
  isPixRow,
  spendingBreakdown,
} from './movement-report.mapper'
import { MovementRepository } from './movement.repository'
import { toTransactionDto } from './transaction.mapper'

export interface MovementListQuery {
  month?: string
  accountId?: string
  direction?: string
  search?: string
}

@Injectable()
export class MovementService {
  constructor(
    private readonly repo: MovementRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async listByMonth(userId: string, query: MovementListQuery): Promise<Transaction[]> {
    const range = await this.rangeFor(userId, query.accountId, query.month)
    const direction = resolveDirection(query.direction)
    const rows = await this.repo.findMany(userId, range, {
      accountId: query.accountId,
      direction,
      search: query.search,
    })
    // Movimentação nunca tem split (03-regras-negocio § Escopo: só existe em cartão de crédito) — nunca
    // passa `row.splits` aqui de propósito, mesmo que o tipo do row tivesse o campo.
    return rows.map((row) => toTransactionDto(row))
  }

  async totals(userId: string, month?: string): Promise<MovementTotals> {
    return this.repo.totals(userId, resolveMonthRange(month))
  }
  // Resumo descritivo da conta de benefício (03-regras-negocio § Extrato e relatório da conta de benefício).
  // Só conta que não é cartão de crédito; nunca alimenta orçamento nem IA.
  async report(userId: string, accountId: string | undefined, month?: string): Promise<MovementReport> {
    const account = await this.movementAccount(userId, accountId)
    const range = periodRange(account, month)
    const targetMonth = month ?? monthKey(new Date())
    const rows = await this.repo.findMany(userId, range, { accountId: account.id })
    const benefit = account.isBenefitAccount
    const today = dayOfMonth(new Date())

    return {
      accountId: account.id,
      month: targetMonth,
      balanceCents: account.balanceCents,
      lastSyncAt: account.pluggyItem?.lastSyncAt?.toISOString() ?? null,
      ...computeMovementReport({
        rows,
        month: targetMonth,
        balanceCents: account.balanceCents,
        currentMonthKey: monthKey(new Date()),
        todayDayOfMonth: dayOfMonth(new Date()),
        dayKeyOf: dateKey,
        ...(benefit
          ? {
              days: daysBetween(range),
              daysRemaining: today < BENEFIT_DEPOSIT_DAY ? BENEFIT_DEPOSIT_DAY - today : null,
            }
          : {}),
      }),
    }
  }

  // Pix enviados agrupados por favorecido (nome vem da descrição do banco, normalizado). O nome só aparece
  // aqui e no extrato, pro próprio usuário — nunca em relatório do cartão, insight, IA ou log (08 § 13).
  async pixRecipients(
    userId: string,
    accountId: string | undefined,
    month?: string,
    search?: string,
  ): Promise<PixRecipientsResponse> {
    const account = await this.movementAccount(userId, accountId)
    const rows = await this.repo.findMany(userId, periodRange(account, month), {
      accountId: account.id,
      direction: 'OUT',
    })
    const recipients = groupPixRecipients(rows, search)
    return {
      month: month ?? monthKey(new Date()),
      totalCents: recipients.reduce((sum, recipient) => sum + recipient.totalCents, 0),
      recipients,
    }
  }

  async pixTransactions(
    userId: string,
    accountId: string | undefined,
    recipient: string | undefined,
    month?: string,
  ): Promise<Transaction[]> {
    if (!recipient) throw new DomainError('RECIPIENT_REQUIRED', 'Informe o favorecido.', 400)
    const account = await this.movementAccount(userId, accountId)
    const rows = await this.repo.findMany(userId, periodRange(account, month), {
      accountId: account.id,
      direction: 'OUT',
    })
    return filterPixRowsByRecipient(rows, recipient).map((row) => toTransactionDto(row))
  }

  // "Para onde vai": saídas do mês por estabelecimento, com Pix e pagamento de fatura à parte (03-regras-negocio
  // § Extrato e relatório da conta de benefício). Só descritivo; nunca alimenta orçamento nem IA.
  async spending(userId: string, accountId: string | undefined, month?: string): Promise<MovementSpending> {
    const account = await this.movementAccount(userId, accountId)
    const rows = await this.repo.findMany(userId, periodRange(account, month), {
      accountId: account.id,
      direction: 'OUT',
    })
    return { month: month ?? monthKey(new Date()), ...spendingBreakdown(rows) }
  }

  // Gastos que se repetem (03-regras-negocio § Extrato e relatório da conta de benefício): recorrentes com o
  // mesmo detector do cartão (últimos 4 meses, independe do mês escolhido) e os estabelecimentos mais
  // frequentes do mês. Pix nunca entra. O detector foi feito pra cartão (dono = pessoa self); aqui toda a
  // conta é do dono, então cada linha vira "dele" com um id fixo.
  async habits(userId: string, accountId: string | undefined, month?: string): Promise<MovementHabits> {
    const account = await this.movementAccount(userId, accountId)
    const currentMonth = monthKey(new Date())
    const monthRows = await this.repo.findMany(userId, periodRange(account, month), {
      accountId: account.id,
      direction: 'OUT',
    })
    const windowRows = await this.repo.findMany(
      userId,
      { start: monthRange(shiftMonthKey(currentMonth, -4)).start, end: monthRange(currentMonth).end },
      { accountId: account.id, direction: 'OUT' },
    )

    const owner = 'account-owner'
    const recurring = detectSubscriptions(
      windowRows
        .filter((row) => row.kind === 'EXPENSE' && !isPixRow(row))
        .map((row) => ({
          kind: 'EXPENSE' as const,
          amountCents: row.amountCents,
          occurredAt: row.occurredAt,
          merchant: row.merchant,
          description: row.description,
          personId: owner,
          splits: [],
        })),
      owner,
      new Date(),
    )
    return { recurring, frequent: frequentEstablishments(monthRows) }
  }

  private async rangeFor(userId: string, accountId: string | undefined, month?: string) {
    if (!accountId) return resolveMonthRange(month)
    const account = await this.accounts.findById(userId, accountId)
    return account ? periodRange(account, month) : resolveMonthRange(month)
  }

  private async movementAccount(userId: string, accountId: string | undefined) {
    if (!accountId) throw new DomainError('ACCOUNT_ID_REQUIRED', 'Informe accountId.', 400)
    const account = await this.accounts.findById(userId, accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.type === 'CREDIT_CARD') {
      throw new DomainError('NOT_A_MOVEMENT_ACCOUNT', 'Isso só existe para conta que não é cartão de crédito.', 422)
    }
    return account
  }
}

function resolveDirection(direction?: string): 'IN' | 'OUT' | undefined {
  if (!direction) return undefined
  if (direction !== 'IN' && direction !== 'OUT') {
    throw new DomainError('INVALID_DIRECTION', 'Direção inválida (esperado IN ou OUT).', 400)
  }
  return direction
}

function periodRange(account: { isBenefitAccount: boolean }, month?: string): { start: Date; end: Date } {
  const key = month ?? monthKey(new Date())
  resolveMonthRange(key)
  return account.isBenefitAccount ? benefitPeriodRange(key) : resolveMonthRange(key)
}

function daysBetween(range: { start: Date; end: Date }): string[] {
  const days: string[] = []
  for (let at = range.start.getTime(); at < range.end.getTime(); at += 86_400_000) days.push(dateKey(new Date(at)))
  return days
}
