import { Inject, Injectable } from '@nestjs/common'
import { installmentBaseName, installmentGroupKey } from '../../common/installment-group'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { Prisma } from '@prisma/client'
import type { InvoiceRow } from './invoice.mapper'
import type { InstallmentSource } from './installment-forecast.mapper'
import type { StatementRow } from './statement.mapper'

function openSince(after?: Date): Prisma.TransactionWhereInput {
  if (!after) return {}
  return { OR: [{ installmentDueAt: null, occurredAt: { gte: after } }, { installmentDueAt: { gte: after } }] }
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
        billId: null,
        ...openSince(after),
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD', source: 'PLUGGY', ...(accountId ? { id: accountId } : {}) },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => toInvoiceRow(row, installmentOf(row)))
  }

  // Só pagamento ainda sem fatura ou ligado à fatura fechada: o ligado a uma fatura anterior (pago no dia do
  // fechamento, por exemplo) já quitou aquela e não é antecipado.
  async sumPaymentsSince(userId: string, accountId: string, since: Date, closedBillId: string): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
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
    return rows.map((row) => ({
      ...toInvoiceRow(row, installmentOf(row)),
      label: row.displayName ?? row.merchant ?? purchaseName(row),
      installmentNumber: row.installmentNumber,
      installmentTotal: row.installmentTotal,
      sortAt: row.installmentDueAt ?? row.occurredAt,
    }))
  }

  // Todas as parcelas conhecidas de cartões PLUGGY (lançadas ou não, já faturadas ou não): a de maior número
  // de cada compra é a referência pra estimar as que o banco ainda não mandou.
  async findInstallmentSources(userId: string, accountId: string): Promise<InstallmentSource[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        kind: 'EXPENSE',
        installmentNumber: { not: null },
        installmentTotal: { not: null },
        installmentDueAt: { not: null },
        account: { id: accountId, type: 'CREDIT_CARD', source: 'PLUGGY' },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.flatMap((row) =>
      row.installmentNumber == null || row.installmentTotal == null || row.installmentDueAt == null
        ? []
        : [
            {
              groupKey: installmentGroupKey({
                description: row.description,
                occurredAt: row.occurredAt,
                installmentTotal: row.installmentTotal,
                installmentNumber: row.installmentNumber,
              }),
              number: row.installmentNumber,
              total: row.installmentTotal,
              dueAt: row.installmentDueAt,
              amountCents: row.amountCents,
              kind: 'EXPENSE' as const,
              personId: row.personId,
              splits: row.splits,
              label: row.displayName ?? row.merchant ?? purchaseName(row),
            },
          ],
    )
  }

  async findLastInstallmentDueAt(userId: string, accountId: string): Promise<Date | null> {
    const result = await this.prisma.transaction.aggregate({
      where: { userId, accountId, billId: null, installmentDueAt: { not: null } },
      _max: { installmentDueAt: true },
    })
    return result._max.installmentDueAt
  }
}

function installmentOf(row: {
  description: string
  occurredAt: Date
  installmentNumber: number | null
  installmentTotal: number | null
}): InvoiceRow['installment'] {
  if (row.installmentNumber == null || row.installmentTotal == null) return null
  return {
    groupKey: installmentGroupKey({
      description: row.description,
      occurredAt: row.occurredAt,
      installmentTotal: row.installmentTotal,
      installmentNumber: row.installmentNumber,
    }),
    number: row.installmentNumber,
  }
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
