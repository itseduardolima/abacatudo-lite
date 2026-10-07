import { Inject, Injectable } from '@nestjs/common'
import { clusterInstallmentKeys, installmentBaseName } from '../../common/installment-group'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { Prisma } from '@prisma/client'
import type { InvoiceRow } from './invoice.mapper'
import type { StatementRow } from './statement.mapper'

function openSince(after?: Date): Prisma.TransactionWhereInput {
  if (!after) return {}
  return {
    OR: [
      { installmentDueAt: null, occurredAt: { gte: after } },
      { installmentDueAt: { gte: after } },
      { installmentNumber: null, status: 'PENDING' },
    ],
  }
}

@Injectable()
export class InvoiceRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // EXPENSE/REFUND só de conta CREDIT_CARD — CARD_PAYMENT nunca entra na fatura (03-regras-negocio §
  // Movimentações: a linha de pagamento é excluída do gasto). Usado só pra conta MANUAL/IMPORT, que não
  // tem billId de banco de verdade — mês calendário é a aproximação possível.
  async findRows(userId: string, range: { start: Date; end: Date }, accountId?: string): Promise<InvoiceRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        cancelledAt: null,
        occurredAt: { gte: range.start, lt: range.end },
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD', ...(accountId ? { id: accountId } : {}) },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => toInvoiceRow(row, null))
  }

  // Fatura de verdade (03-regras-negocio § Movimentações: "agrupa por billId; as pendentes (sem billId)
  // pertencem à fatura aberta") — usado pra conta PLUGGY, cujo billId vem do banco real no sync. Nunca
  // filtra por `occurredAt`: o fechamento do cartão quase nunca bate com o mês calendário. Inclui
  // CARD_PAYMENT (só aqui — nunca em findRows): pagamento antecipado abate o que falta pagar da fatura
  // aberta (computeInvoice trata o sinal). Traz description/occurredAt/installmentTotal pra
  // keepNextDueInstallmentOnly identificar qual parcela é a próxima a vencer.
  async findOpenRows(userId: string, accountId?: string, after?: Date): Promise<InvoiceRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        cancelledAt: null,
        billId: null,
        ...openSince(after),
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD', source: 'PLUGGY', ...(accountId ? { id: accountId } : {}) },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    const installments = installmentsOf(rows)
    return rows.map((row, index) => toInvoiceRow(row, installments[index]!))
  }

  // Só pagamento ainda sem fatura ou ligado à fatura fechada: o ligado a uma fatura anterior (pago no dia do
  // fechamento, por exemplo) já quitou aquela e não é antecipado.
  async sumPaymentsSince(userId: string, accountId: string, since: Date, closedBillId: string): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        cancelledAt: null,
        accountId,
        kind: 'CARD_PAYMENT',
        occurredAt: { gte: since },
        OR: [{ billId: null }, { billId: closedBillId }],
        account: { type: 'CREDIT_CARD', source: 'PLUGGY' },
      },
      _sum: { amountCents: true },
    })
    return result._sum.amountCents ?? 0
  }

  // Fatura prevista (03-regras-negocio § Fatura prevista): parcelas ainda sem billId cuja data de
  // vencimento (installmentDueAt, a `date` do Pluggy) cai no mês pedido — nunca a compra inteira, nunca
  // CARD_PAYMENT.
  async findForecastRows(userId: string, accountId: string, range: { start: Date; end: Date }): Promise<InvoiceRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        cancelledAt: null,
        billId: null,
        installmentDueAt: { gte: range.start, lt: range.end },
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { id: accountId, type: 'CREDIT_CARD', source: 'PLUGGY' },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => toInvoiceRow(row, null))
  }

  findStatementOpenRows(userId: string, accountId: string, after?: Date): Promise<StatementRow[]> {
    return this.statementRows({
      userId,
      cancelledAt: null,
      billId: null,
      ...openSince(after),
      kind: { in: ['EXPENSE', 'REFUND'] },
      account: { id: accountId, type: 'CREDIT_CARD', source: 'PLUGGY' },
    })
  }

  findStatementForecastRows(
    userId: string,
    accountId: string,
    range: { start: Date; end: Date },
  ): Promise<StatementRow[]> {
    return this.statementRows({
      userId,
      cancelledAt: null,
      billId: null,
      installmentDueAt: { gte: range.start, lt: range.end },
      kind: { in: ['EXPENSE', 'REFUND'] },
      account: { id: accountId, type: 'CREDIT_CARD', source: 'PLUGGY' },
    })
  }

  findStatementCalendarRows(
    userId: string,
    accountId: string,
    range: { start: Date; end: Date },
  ): Promise<StatementRow[]> {
    return this.statementRows({
      userId,
      cancelledAt: null,
      occurredAt: { gte: range.start, lt: range.end },
      kind: { in: ['EXPENSE', 'REFUND'] },
      account: { id: accountId, type: 'CREDIT_CARD' },
    })
  }

  private async statementRows(where: Prisma.TransactionWhereInput): Promise<StatementRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where,
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    const installments = installmentsOf(rows)
    return rows.map((row, index) => ({
      ...toInvoiceRow(row, installments[index]!),
      label: row.displayName ?? row.merchant ?? purchaseName(row),
      installmentNumber: row.installmentNumber,
      installmentTotal: row.installmentTotal,
      sortAt: row.installmentDueAt ?? row.occurredAt,
    }))
  }

  async findLastInstallmentDueAt(userId: string, accountId: string): Promise<Date | null> {
    const result = await this.prisma.transaction.aggregate({
      where: { userId, accountId, cancelledAt: null, billId: null, installmentDueAt: { not: null } },
      _max: { installmentDueAt: true },
    })
    return result._max.installmentDueAt
  }
}

function installmentsOf(
  rows: {
    accountId: string
    description: string
    occurredAt: Date
    amountCents: number
    installmentNumber: number | null
    installmentTotal: number | null
  }[],
): InvoiceRow['installment'][] {
  const keys = clusterInstallmentKeys(rows)
  return rows.map((row, index) => {
    const groupKey = keys[index]
    if (row.installmentNumber == null || groupKey == null) return null
    return { groupKey, number: row.installmentNumber }
  })
}

function toInvoiceRow(
  row: {
    kind: string
    amountCents: number
    personId: string | null
    splits: { personId: string; amountCents: number }[]
  },
  installment: InvoiceRow['installment'],
): InvoiceRow {
  return {
    kind: row.kind as 'EXPENSE' | 'REFUND' | 'CARD_PAYMENT',
    amountCents: row.amountCents,
    personId: row.personId,
    splits: row.splits,
    installment,
  }
}

function purchaseName(row: {
  description: string
  installmentNumber: number | null
  installmentTotal: number | null
}): string {
  return row.installmentTotal == null
    ? row.description
    : installmentBaseName({
        description: row.description,
        installmentNumber: row.installmentNumber,
        installmentTotal: row.installmentTotal,
      })
}
