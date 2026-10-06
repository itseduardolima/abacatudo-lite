import { Injectable, Logger } from '@nestjs/common'
import type { AccountInvoice, EstimatedInstallmentsResponse, Invoice, StatementsResponse } from '@gastos/shared'
import { lastClosingCutoff, monthKey, nextClosingCutoff, resolveMonthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithPluggyItem } from '../account/account.repository'
import { PluggyClient } from '../banking/pluggy/pluggy.client'
import { PersonRepository } from '../person/person.repository'
import {
  advancePaidCents,
  applyAdvancePayment,
  computeInvoice,
  keepNextDueInstallmentOnly,
  mergeInvoices,
  type InvoiceRow,
} from './invoice.mapper'
import { estimateInstallments, type InstallmentSource } from './installment-forecast.mapper'
import { InvoiceRepository } from './invoice.repository'
import { buildPersonStatements, formatStatementText, type StatementRow } from './statement.mapper'

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)

  constructor(
    private readonly repo: InvoiceRepository,
    private readonly accounts: AccountRepository,
    private readonly people: PersonRepository,
    private readonly pluggy: PluggyClient,
  ) {}

  async getForAccount(userId: string, accountId: string | undefined, month?: string): Promise<AccountInvoice> {
    if (!accountId) throw new DomainError('ACCOUNT_ID_REQUIRED', 'Informe accountId.', 400)

    const account = await this.accounts.findById(userId, accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.type !== 'CREDIT_CARD') {
      throw new DomainError('NOT_A_CARD_ACCOUNT', 'Fatura só existe pra conta de cartão de crédito.', 422)
    }

    const selfId = await this.selfPersonId(userId)
    const lastForecastMonth = await this.lastForecastMonth(account)

    return {
      ...(await this.invoiceForAccount(account, selfId, month)),
      isForecast: this.isForecastFor(account, month),
      lastForecastMonth,
    }
  }

  // Parcelas estimadas do cartão num mês futuro, pra tela listar à parte das lançadas (nunca gravadas).
  async getEstimates(
    userId: string,
    accountId: string | undefined,
    month?: string,
  ): Promise<EstimatedInstallmentsResponse> {
    if (!accountId) throw new DomainError('ACCOUNT_ID_REQUIRED', 'Informe accountId.', 400)
    const account = await this.accounts.findById(userId, accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.type !== 'CREDIT_CARD') {
      throw new DomainError('NOT_A_CARD_ACCOUNT', 'Fatura só existe pra conta de cartão de crédito.', 422)
    }

    const targetMonth = month ? resolveMonthKey(month) : monthKey(new Date())
    const isForecast = this.isForecastFor(account, targetMonth)
    const isCurrent = targetMonth === monthKey(new Date())
    const candidates = isForecast
      ? await this.estimatedInstallments(account, resolveMonthRange(targetMonth))
      : isCurrent
        ? await this.openEstimatedInstallments(account)
        : []
    const items = candidates.sort(
      (a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.label.localeCompare(b.label, 'pt-BR'),
    )

    return {
      month: targetMonth,
      totalCents: items.reduce((sum, item) => sum + item.amountCents, 0),
      items: items.map((item) => ({
        key: `${item.groupKey}#${item.number}`,
        label: item.label,
        amountCents: item.amountCents,
        installmentNumber: item.number,
        installmentTotal: item.total,
        dueAt: item.dueAt.toISOString(),
      })),
    }
  }

  // Mensagem de conta por pessoa (03-regras-negocio § Mensagem de conta): mesma fatura que a tela mostra
  // (aberta, ou prevista se o mês é futuro), só a parte de cada pessoa não-self. Nunca envia nada — só
  // devolve o texto pronto; quem manda é o usuário, na mão.
  async getStatements(userId: string, month?: string): Promise<StatementsResponse> {
    const currentMonth = monthKey(new Date())
    const targetMonth = month ? resolveMonthKey(month) : currentMonth
    const isForecast = targetMonth > currentMonth
    const range = resolveMonthRange(targetMonth)

    const people = await this.people.findMany(userId, true)
    const cardAccounts = (await this.accounts.findMany(userId, false)).filter((a) => a.type === 'CREDIT_CARD')

    const cards = await Promise.all(
      cardAccounts.map(async (account) => ({
        accountId: account.id,
        accountName: account.name,
        dueDay: account.dueDay,
        rows: await this.statementRows(account, range, isForecast),
      })),
    )

    const statements = buildPersonStatements(cards, people).map((statement) => ({
      personId: statement.personId,
      personName: statement.personName,
      totalCents: statement.totalCents,
      text: formatStatementText(statement, targetMonth, isForecast),
    }))
    return { month: targetMonth, isForecast, statements }
  }

  private async statementRows(
    account: AccountWithPluggyItem,
    range: { start: Date; end: Date },
    isForecast: boolean,
  ): Promise<StatementRow[]> {
    if (account.source !== 'PLUGGY') return this.repo.findStatementCalendarRows(account.userId, account.id, range)
    if (isForecast) {
      const [real, estimated] = await Promise.all([
        this.repo.findStatementForecastRows(account.userId, account.id, range),
        this.estimatedInstallments(account, range),
      ])
      return [...real, ...estimated.map(toStatementRow)]
    }
    return keepNextDueInstallmentOnly(
      await this.repo.findStatementOpenRows(account.userId, account.id, openAfter(account)),
    )
  }

  // "Meu" da fatura aberta, somado em todos os cartões (03-regras-negocio § Só a minha parte) — é o
  // número que alimenta o ritmo (HU 7.4). É a fatura de agora; não existe "mês passado" aqui. Só um mês
  // futuro muda o resultado: aí soma a fatura prevista de cada cartão (só parcelas já lançadas).
  async getSummary(userId: string, month?: string): Promise<Invoice> {
    const selfId = await this.selfPersonId(userId)
    const cardAccounts = (await this.accounts.findMany(userId, false)).filter((a) => a.type === 'CREDIT_CARD')
    const futureMonth = month && resolveMonthKey(month) > monthKey(new Date()) ? month : undefined

    const invoices = await Promise.all(
      cardAccounts.map((account) => this.invoiceForAccount(account, selfId, futureMonth)),
    )
    return mergeInvoices(invoices)
  }

  async getHalfMineCents(userId: string, range: { start: Date; end: Date }): Promise<number> {
    const selfId = await this.selfPersonId(userId)
    const cards = (await this.accounts.findMany(userId, false)).filter((a) => a.type === 'CREDIT_CARD')
    const perCard = await Promise.all(
      cards.map(async (account) => {
        if (account.source !== 'PLUGGY') {
          return computeInvoice(await this.repo.findRows(userId, range, account.id), selfId).mineCents
        }
        const [rows, sources] = await Promise.all([
          this.repo.findOpenRowsInRange(userId, account.id, range, openAfter(account)),
          this.repo.findInstallmentSources(userId, account.id),
        ])
        const estimated = estimateInstallments(sources)
          .filter((item) => item.dueAt >= range.start && item.dueAt < range.end)
          .map(toInvoiceRow)
        return computeInvoice([...rows, ...estimated], selfId).mineCents
      }),
    )
    return perCard.reduce((sum, cents) => sum + cents, 0)
  }

  // PLUGGY: fatura aberta = lançamentos sem billId (e, com closingDay, só depois do último fechamento),
  // só a parcela da vez em compra parcelada. Fatura já fechada não entra. MANUAL/IMPORT: mês calendário.
  private isForecastFor(account: AccountWithPluggyItem, month?: string): boolean {
    return account.source === 'PLUGGY' && Boolean(month) && resolveMonthKey(month as string) > monthKey(new Date())
  }

  private async invoiceForAccount(
    account: AccountWithPluggyItem,
    selfPersonId: string,
    month?: string,
  ): Promise<Invoice & { estimatedCents: number; advancePaidCents: number }> {
    if (this.isForecastFor(account, month)) {
      const range = resolveMonthRange(month as string)
      const [real, estimated] = await Promise.all([
        this.repo.findForecastRows(account.userId, account.id, range),
        this.estimatedInstallments(account, range),
      ])
      const estimatedRows = estimated.map(toInvoiceRow)
      return {
        ...computeInvoice([...real, ...estimatedRows], selfPersonId),
        estimatedCents: computeInvoice(estimatedRows, selfPersonId).totalCents,
        advancePaidCents: 0,
      }
    }

    if (account.source !== 'PLUGGY') {
      const rows = await this.repo.findRows(account.userId, resolveMonthRange(month), account.id)
      return { ...computeInvoice(rows, selfPersonId), estimatedCents: 0, advancePaidCents: 0 }
    }

    const [rows, estimated] = await Promise.all([
      this.repo.findOpenRows(account.userId, account.id, openAfter(account)),
      this.openEstimatedInstallments(account),
    ])
    const estimatedRows = estimated.map(toInvoiceRow)
    const advancePaid = await this.advancePaid(account)
    return {
      ...applyAdvancePayment(
        computeInvoice([...keepNextDueInstallmentOnly(rows), ...estimatedRows], selfPersonId),
        advancePaid,
      ),
      estimatedCents: computeInvoice(estimatedRows, selfPersonId).totalCents,
      advancePaidCents: advancePaid,
    }
  }

  private async advancePaid(account: AccountWithPluggyItem): Promise<number> {
    if (!account.closingDay) return 0
    const since = lastClosingCutoff(account.closingDay)
    const payments = await this.repo.sumPaymentsSince(account.userId, account.id, since)
    if (payments === 0) return 0
    return advancePaidCents(payments, await this.closedBillCents(account, since))
  }

  // O Pluggy só materializa a fatura depois de um tempo: a última que ele manda pode ser a do ciclo anterior (já
  // paga, vencimento antes do último fechamento). Só vale a fatura que vence depois do fechamento.
  private async closedBillCents(account: AccountWithPluggyItem, since: Date): Promise<number | null> {
    if (account.closedBillCents !== null) return account.closedBillCents
    if (!account.externalAccountId) return null
    try {
      const bill = await this.pluggy.getLastClosedBill(account.externalAccountId)
      if (bill?.totalAmount == null || bill.dueDate.slice(0, 10) < since.toISOString().slice(0, 10)) return null
      return Math.round(Math.abs(bill.totalAmount) * 100)
    } catch (error) {
      this.logger.warn(
        `Não foi possível buscar a última fatura fechada no Pluggy pra conta ${account.id}: ${String(error)}`,
      )
      return null
    }
  }

  // Parcelas estimadas (03-regras-negocio § Fatura prevista) só de mês posterior ao atual, e só do cartão
  // PLUGGY. Sem `range`, devolve todas (pra achar até onde a previsão vai).
  private async estimatedInstallments(
    account: AccountWithPluggyItem,
    range?: { start: Date; end: Date },
  ): Promise<InstallmentSource[]> {
    if (account.source !== 'PLUGGY') return []
    const currentMonth = monthKey(new Date())
    const sources = await this.repo.findInstallmentSources(account.userId, account.id)
    return estimateInstallments(sources).filter(
      (item) =>
        monthKey(item.dueAt) > currentMonth && (!range || (item.dueAt >= range.start && item.dueAt < range.end)),
    )
  }

  private async openEstimatedInstallments(account: AccountWithPluggyItem): Promise<InstallmentSource[]> {
    if (account.source !== 'PLUGGY' || !account.closingDay) return []
    const from = lastClosingCutoff(account.closingDay)
    const until = nextClosingCutoff(account.closingDay)
    const sources = await this.repo.findInstallmentSources(account.userId, account.id)
    return estimateInstallments(sources).filter((item) => item.dueAt >= from && item.dueAt < until)
  }

  private async lastForecastMonth(account: AccountWithPluggyItem): Promise<string | null> {
    if (account.source !== 'PLUGGY') return null
    const [last, estimated] = await Promise.all([
      this.repo.findLastInstallmentDueAt(account.userId, account.id),
      this.estimatedInstallments(account),
    ])
    const months = [...(last ? [monthKey(last)] : []), ...estimated.map((item) => monthKey(item.dueAt))]
    return months.sort().at(-1) ?? null
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}

function openAfter(account: AccountWithPluggyItem): Date | undefined {
  return account.closingDay ? lastClosingCutoff(account.closingDay) : undefined
}

function resolveMonthKey(month: string): string {
  resolveMonthRange(month)
  return month
}

function toInvoiceRow(item: InstallmentSource): InvoiceRow {
  return {
    kind: item.kind,
    amountCents: item.amountCents,
    personId: item.personId,
    splits: item.splits,
    installment: null,
  }
}

function toStatementRow(item: InstallmentSource): StatementRow {
  return {
    ...toInvoiceRow(item),
    label: item.label,
    installmentNumber: item.number,
    installmentTotal: item.total,
    sortAt: item.dueAt,
    estimated: true,
  }
}
