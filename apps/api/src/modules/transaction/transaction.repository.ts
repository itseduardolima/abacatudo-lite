import { Inject, Injectable } from '@nestjs/common'
import type { Prisma, Transaction } from '@prisma/client'
import { monthKey, monthRange, PENDING_LOOKBACK_MS, resolveLastClosingCutoff } from '../../common/date/timezone'
import { keepCurrentInstallmentsOnly } from '../../common/installment-group'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

const SPLITS_SELECT = { splits: { select: { personId: true, amountCents: true } } } as const

export function isInOpenCycle(
  row: {
    billId: string | null
    status: Transaction['status']
    occurredAt: Date
    installmentNumber: number | null
    installmentDueAt: Date | null
    account: { closingDay: number | null }
  },
  range: { start: Date; end: Date },
  now: Date = new Date(),
  latestBilledPurchaseAt: Date | null = null,
): boolean {
  if (row.billId !== null || !row.account.closingDay) return true
  if (
    row.installmentNumber === null &&
    row.status === 'PENDING' &&
    row.occurredAt.getTime() >= now.getTime() - PENDING_LOOKBACK_MS
  )
    return true
  if (row.occurredAt >= range.start && row.occurredAt < range.end) return true
  return (
    (row.installmentDueAt ?? row.occurredAt) >=
    resolveLastClosingCutoff(row.account.closingDay, latestBilledPurchaseAt, now)
  )
}

export type TransactionWithSplits = Transaction & { splits: { personId: string; amountCents: number }[] }

// Só CREDIT_CARD (03-regras-negocio § Escopo) nas leituras.
@Injectable()
export class TransactionRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.TransactionUncheckedCreateInput, 'userId'>): Promise<Transaction> {
    return this.prisma.transaction.create({ data: { ...data, userId } })
  }

  // Mês calendário (occurredAt) OU parcela ainda sem billId de conta PLUGGY — não só o primeiro: uma
  // parcela que vence agora pode ter sido comprada meses atrás (a data da linha é a da compra, não a do
  // vencimento), então "mês calendário" sozinho a deixava de fora da fatura aberta pra sempre (achado ao
  // vivo comparando com o OFX de um Nubank real: Centauro e Mercado Livre comprados em agosto, parcela
  // vencendo agora em setembro, nunca apareciam). keepCurrentInstallmentsOnly: uma compra parcelada
  // compartilha a mesma occurredAt em todas as parcelas — sem o filtro, uma compra em 3x aparecia inteira.
  async findMany(userId: string, range: { start: Date; end: Date }): Promise<TransactionWithSplits[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        account: { type: 'CREDIT_CARD' },
        OR: [
          { occurredAt: { gte: range.start, lt: range.end } },
          { billId: null, account: { type: 'CREDIT_CARD', source: 'PLUGGY' } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      include: { ...SPLITS_SELECT, account: { select: { closingDay: true } } },
    })
    const latestBilled = await this.latestBilledPurchaseByAccount(userId)
    const open = rows.filter((row) => isInOpenCycle(row, range, new Date(), latestBilled.get(row.accountId) ?? null))
    return keepCurrentInstallmentsOnly(open.map(({ account: _account, ...row }) => row))
  }

  private async latestBilledPurchaseByAccount(userId: string): Promise<Map<string, Date>> {
    const groups = await this.prisma.transaction.groupBy({
      by: ['accountId'],
      where: {
        userId,
        cancelledAt: null,
        billId: { not: null },
        kind: 'EXPENSE',
        installmentNumber: null,
        account: { type: 'CREDIT_CARD', source: 'PLUGGY' },
      },
      _max: { occurredAt: true },
    })
    return new Map(groups.flatMap((group) => (group._max.occurredAt ? [[group.accountId, group._max.occurredAt]] : [])))
  }

  // Fatura prevista (03-regras-negocio § Fatura prevista): só as parcelas ainda sem billId cuja data de
  // vencimento (installmentDueAt) cai no mês futuro pedido. Sem keepCurrentInstallmentsOnly — aqui as
  // parcelas seguintes de uma compra são justamente o que se quer ver, cada uma no seu mês.
  findForecast(userId: string, range: { start: Date; end: Date }): Promise<TransactionWithSplits[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        cancelledAt: null,
        billId: null,
        installmentDueAt: { gte: range.start, lt: range.end },
        account: { type: 'CREDIT_CARD', source: 'PLUGGY' },
      },
      orderBy: { installmentDueAt: 'desc' },
      include: SPLITS_SELECT,
    })
  }

  findById(userId: string, id: string): Promise<TransactionWithSplits | null> {
    return this.prisma.transaction.findFirst({
      where: { userId, id, account: { type: 'CREDIT_CARD' } },
      include: SPLITS_SELECT,
    })
  }

  // A data da compra varia de uma parcela pra outra em alguns bancos (BB: 17 e 18/02 na mesma compra), então
  // as candidatas são as do mês da compra — o agrupamento fino é o installmentGroupKey.
  findPurchaseCandidates(
    userId: string,
    accountId: string,
    occurredAt: Date,
    installmentTotal: number,
  ): Promise<
    {
      id: string
      accountId: string
      description: string
      occurredAt: Date
      amountCents: number
      installmentNumber: number | null
      installmentTotal: number | null
    }[]
  > {
    const purchaseMonth = monthRange(monthKey(occurredAt))
    return this.prisma.transaction.findMany({
      where: {
        userId,
        accountId,
        occurredAt: { gte: purchaseMonth.start, lt: purchaseMonth.end },
        installmentTotal,
        account: { type: 'CREDIT_CARD' },
      },
      select: {
        id: true,
        accountId: true,
        description: true,
        occurredAt: true,
        amountCents: true,
        installmentNumber: true,
        installmentTotal: true,
      },
    })
  }

  findUnbilledPurchaseCandidates(
    userId: string,
    accountId: string,
    installmentTotal: number,
  ): Promise<
    {
      id: string
      accountId: string
      description: string
      occurredAt: Date
      amountCents: number
      installmentNumber: number | null
      installmentTotal: number | null
    }[]
  > {
    return this.prisma.transaction.findMany({
      where: { userId, accountId, installmentTotal, billId: null, account: { type: 'CREDIT_CARD' } },
      select: {
        id: true,
        accountId: true,
        description: true,
        occurredAt: true,
        amountCents: true,
        installmentNumber: true,
        installmentTotal: true,
      },
    })
  }

  async setCancelledAt(userId: string, ids: string[], cancelledAt: Date | null): Promise<Prisma.BatchPayload> {
    return this.prisma.transaction.updateMany({
      where: { userId, id: { in: ids }, account: { type: 'CREDIT_CARD' } },
      data: { cancelledAt },
    })
  }

  async updateDisplayName(userId: string, ids: string[], displayName: string | null): Promise<Prisma.BatchPayload> {
    return this.prisma.transaction.updateMany({
      where: { userId, id: { in: ids }, account: { type: 'CREDIT_CARD' } },
      data: { displayName },
    })
  }

  async updateCategory(userId: string, id: string, categoryId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.transaction.updateMany({
      where: { userId, id, account: { type: 'CREDIT_CARD' } },
      data: { categoryId },
    })
  }
}
