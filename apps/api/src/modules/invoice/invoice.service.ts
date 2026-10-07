import { Injectable, Logger } from '@nestjs/common'
import type { AccountInvoice, Invoice, StatementsResponse } from '@gastos/shared'
import { lastClosingCutoff, monthKey, resolveMonthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithPluggyItem } from '../account/account.repository'
import { PluggyClient } from '../banking/pluggy/pluggy.client'
import type { PluggyBill } from '../banking/pluggy/pluggy.schemas'
import { PersonRepository } from '../person/person.repository'
import {
  advancePaidCents,
  applyAdvancePayment,
  computeInvoice,
  keepNextDueInstallmentOnly,
  mergeInvoices,
} from './invoice.mapper'
import { InvoiceRepository } from './invoice.repository'
import { buildPersonStatements, formatStatementText, type StatementRow } from './statement.mapper'

const LAST_BILL_TTL_MS = 5 * 60 * 1000

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)
  private readonly lastBillCache = new Map<string, { bill: PluggyBill | null; expiresAt: number }>()

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
      return this.repo.findStatementForecastRows(account.userId, account.id, range)
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

  // PLUGGY: fatura aberta = lançamentos sem billId (e, com closingDay, só depois do último fechamento),
  // só a parcela da vez em compra parcelada. Fatura já fechada não entra. MANUAL/IMPORT: mês calendário.
  private isForecastFor(account: AccountWithPluggyItem, month?: string): boolean {
    return account.source === 'PLUGGY' && Boolean(month) && resolveMonthKey(month as string) > monthKey(new Date())
  }

  private async invoiceForAccount(
    account: AccountWithPluggyItem,
    selfPersonId: string,
    month?: string,
  ): Promise<Invoice & { advancePaidCents: number }> {
    if (this.isForecastFor(account, month)) {
      const range = resolveMonthRange(month as string)
      const real = await this.repo.findForecastRows(account.userId, account.id, range)
      return { ...computeInvoice(real, selfPersonId), advancePaidCents: 0 }
    }

    if (account.source !== 'PLUGGY') {
      const rows = await this.repo.findRows(account.userId, resolveMonthRange(month), account.id)
      return { ...computeInvoice(rows, selfPersonId), advancePaidCents: 0 }
    }

    const rows = await this.repo.findOpenRows(account.userId, account.id, openAfter(account))
    const advancePaid = await this.advancePaid(account)
    return {
      ...applyAdvancePayment(computeInvoice(keepNextDueInstallmentOnly(rows), selfPersonId), advancePaid),
      advancePaidCents: advancePaid,
    }
  }

  private async advancePaid(account: AccountWithPluggyItem): Promise<number> {
    if (!account.closingDay) return 0
    const since = lastClosingCutoff(account.closingDay)
    const bill = await this.closedBill(account, since)
    if (!bill) return 0
    const payments = await this.repo.sumPaymentsSince(account.userId, account.id, since, bill.id)
    return advancePaidCents(payments, bill.cents)
  }

  // O Pluggy só materializa a fatura depois de um tempo: a última que ele manda pode ser a do ciclo anterior (já
  // paga, vencimento antes do último fechamento). Só vale a fatura que vence depois do fechamento.
  private async closedBill(account: AccountWithPluggyItem, since: Date): Promise<{ id: string; cents: number } | null> {
    if (!account.externalAccountId) return null
    try {
      const bill = await this.lastClosedBill(account.externalAccountId)
      if (bill?.totalAmount == null || bill.dueDate.slice(0, 10) < since.toISOString().slice(0, 10)) return null
      return { id: bill.id, cents: Math.round(Math.abs(bill.totalAmount) * 100) }
    } catch (error) {
      this.logger.warn(
        `Não foi possível buscar a última fatura fechada no Pluggy pra conta ${account.id}: ${String(error)}`,
      )
      return null
    }
  }

  private async lastClosedBill(externalAccountId: string): Promise<PluggyBill | null> {
    const cached = this.lastBillCache.get(externalAccountId)
    if (cached && cached.expiresAt > Date.now()) return cached.bill
    const bill = await this.pluggy.getLastClosedBill(externalAccountId)
    this.lastBillCache.set(externalAccountId, { bill, expiresAt: Date.now() + LAST_BILL_TTL_MS })
    return bill
  }

  private async lastForecastMonth(account: AccountWithPluggyItem): Promise<string | null> {
    if (account.source !== 'PLUGGY') return null
    const last = await this.repo.findLastInstallmentDueAt(account.userId, account.id)
    return last ? monthKey(last) : null
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
