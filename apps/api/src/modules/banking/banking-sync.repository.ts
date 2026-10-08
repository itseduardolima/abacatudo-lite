import { Inject, Injectable } from '@nestjs/common'
import type { Transaction } from '@prisma/client'
import { brasiliaDayStart } from '../../common/date/timezone'
import { PRISMA, setUserInTransaction, type PrismaService } from '../../prisma/prisma.client'
import type { MappedTransaction, SettledPendingTwin } from './banking.mapper'

@Injectable()
export class BankingSyncRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  async withAdvisoryLock(key: number, fn: () => Promise<void>): Promise<boolean> {
    return this.prisma.$transaction(
      async (tx) => {
        const [row] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${key}) AS locked`
        if (!row?.locked) return false
        await fn()
        return true
      },
      { timeout: 60 * 60 * 1000, maxWait: 10_000 },
    )
  }

  // Upsert por [accountId, externalId] (idempotente: sincronizar de novo nunca duplica). personId/
  // categoryId só entram na criação (padrão "Meu"/Rule pra cartão, sempre null pra movimentação — ver
  // banking.service.ts); o update nunca toca categoryId/personId/note — são do usuário, o Pluggy não manda
  // isso (03-regras-negocio).
  async upsertTransaction(
    userId: string,
    accountId: string,
    personId: string | null,
    categoryId: string | null,
    data: MappedTransaction,
  ): Promise<void> {
    await this.prisma.transaction.upsert({
      where: { accountId_externalId: { accountId, externalId: data.externalId } },
      create: { ...data, accountId, userId, personId, categoryId },
      update: {
        kind: data.kind,
        status: data.status,
        amountCents: data.amountCents,
        occurredAt: data.occurredAt,
        description: data.description,
        merchant: data.merchant,
        cardLast4: data.cardLast4,
        installmentNumber: data.installmentNumber,
        installmentTotal: data.installmentTotal,
        installmentDueAt: data.installmentDueAt,
        billId: data.billId,
      },
    })
  }

  async mergeSettledPending(userId: string, accountId: string, twins: SettledPendingTwin[]): Promise<void> {
    for (const twin of twins) {
      const [pending, posted] = await Promise.all([
        this.findWithSplits(accountId, twin.pendingId),
        this.findWithSplits(accountId, twin.postedId),
      ])
      if (!pending || !posted || pending.userId !== userId || posted.userId !== userId) continue
      await this.mergeInto(userId, pending, posted)
    }
  }

  async mergeOrphanPending(userId: string, accountId: string, seenExternalIds: string[]): Promise<void> {
    const orphans = await this.prisma.transaction.findMany({
      where: {
        userId,
        accountId,
        kind: 'CARD_PAYMENT',
        status: 'PENDING',
        billId: null,
        installmentNumber: null,
        externalId: { notIn: seenExternalIds },
      },
      include: { splits: { select: { id: true } } },
    })
    for (const pending of orphans) {
      const dayStart = brasiliaDayStart(pending.occurredAt)
      const posted = await this.prisma.transaction.findFirst({
        where: {
          userId,
          accountId,
          kind: 'CARD_PAYMENT',
          status: 'POSTED',
          billId: { not: null },
          installmentNumber: null,
          amountCents: pending.amountCents,
          occurredAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) },
          externalId: { in: seenExternalIds },
        },
        include: { splits: { select: { id: true } } },
      })
      if (posted) await this.mergeInto(userId, pending, posted)
    }
  }

  private findWithSplits(accountId: string, externalId: string) {
    return this.prisma.transaction.findUnique({
      where: { accountId_externalId: { accountId, externalId } },
      include: { splits: { select: { id: true } } },
    })
  }

  private async mergeInto(
    userId: string,
    pending: Transaction & { splits: { id: string }[] },
    posted: Transaction & { splits: { id: string }[] },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await setUserInTransaction(tx, userId)
      if (pending.splits.length > 0 && posted.splits.length === 0) {
        await tx.split.updateMany({
          where: { userId, transactionId: pending.id },
          data: { transactionId: posted.id },
        })
      }
      await tx.transaction.update({
        where: { id: posted.id },
        data: {
          personId: pending.personId ?? posted.personId,
          categoryId: pending.categoryId ?? posted.categoryId,
          note: pending.note ?? posted.note,
        },
      })
      await tx.transaction.delete({ where: { id: pending.id } })
    })
  }
}
