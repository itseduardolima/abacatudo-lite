import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { MappedTransaction } from './banking.mapper'

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
}
