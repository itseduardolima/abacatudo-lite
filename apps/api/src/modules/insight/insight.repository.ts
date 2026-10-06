import { Inject, Injectable } from '@nestjs/common'
import { monthRange, shiftMonthKey } from '../../common/date/timezone'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { SpendingRow } from './insight.mapper'
import type { SubscriptionRow } from './subscription.mapper'

// Compra parcelada em até 48x: uma parcela pode cair até 47 meses depois do mês da compra (occurredAt).
const MAX_INSTALLMENT_LOOKBACK_MONTHS = 47
// Meses de comparação antes do pedido (mês anterior + média dos 3 meses).
const COMPARISON_MONTHS = 3

@Injectable()
export class InsightRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // Só compra no cartão entra no relatório (03-regras-negocio § Relatórios e insights); EXPENSE/REFUND
  // netados como na fatura — CARD_PAYMENT nunca é gasto. Devolve numa consulta só o pedido + os 3 meses
  // anteriores; quem decide em que mês cada linha cai (parcela vs. data da compra) é o mapper. Parcela
  // precisa de uma janela maior pra trás: a data (occurredAt) é a da compra, a parcela cai meses depois.
  async findRows(userId: string, month: string): Promise<SpendingRow[]> {
    const windowStart = monthRange(shiftMonthKey(month, -COMPARISON_MONTHS)).start
    const installmentStart = monthRange(
      shiftMonthKey(month, -COMPARISON_MONTHS - MAX_INSTALLMENT_LOOKBACK_MONTHS),
    ).start
    const end = monthRange(month).end

    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD' },
        OR: [
          { installmentTotal: null, occurredAt: { gte: windowStart, lt: end } },
          { installmentTotal: { not: null }, occurredAt: { gte: installmentStart, lt: end } },
        ],
      },
      include: {
        category: { select: { name: true } },
        person: { select: { name: true } },
        splits: { select: { personId: true, amountCents: true, person: { select: { name: true } } } },
      },
    })
    return rows.map((row) => ({
      kind: row.kind as 'EXPENSE' | 'REFUND',
      amountCents: row.amountCents,
      occurredAt: row.occurredAt,
      installment:
        row.installmentNumber != null && row.installmentTotal != null
          ? { number: row.installmentNumber, total: row.installmentTotal }
          : null,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      merchant: row.merchant,
      personId: row.personId,
      personName: row.person?.name ?? null,
      splits: row.splits.map((split) => ({
        personId: split.personId,
        personName: split.person.name,
        amountCents: split.amountCents,
      })),
    }))
  }

  // Base das assinaturas (9.2): compra à vista no cartão desde `since` (parcela nunca é assinatura).
  async findSubscriptionRows(userId: string, since: Date): Promise<SubscriptionRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        kind: 'EXPENSE',
        installmentTotal: null,
        occurredAt: { gte: since },
        account: { type: 'CREDIT_CARD' },
      },
      include: { splits: { select: { personId: true, amountCents: true, person: { select: { name: true } } } } },
    })
    return rows.map((row) => ({
      kind: 'EXPENSE' as const,
      amountCents: row.amountCents,
      occurredAt: row.occurredAt,
      merchant: row.merchant,
      description: row.description,
      personId: row.personId,
      splits: row.splits.map((split) => ({
        personId: split.personId,
        personName: split.person.name,
        amountCents: split.amountCents,
      })),
    }))
  }
}
