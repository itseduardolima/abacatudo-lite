import { Inject, Injectable } from '@nestjs/common'
import type { CardHolderHint } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class CardHolderHintRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // Uma vez por sync inteiro (todas as contas do item), não uma query por transação — mesmo padrão do
  // ruleByMerchant em BankingService.runSync.
  findMany(userId: string): Promise<CardHolderHint[]> {
    return this.prisma.cardHolderHint.findMany({ where: { userId } })
  }

  // "Sempre para este cartão": um hint por [accountId, cardLast4] — o mesmo final pode existir em contas
  // diferentes, então nunca é só por userId (03-regras-negocio § Atribuição de pessoa, item 2.3).
  upsertPerson(userId: string, accountId: string, cardLast4: string, personId: string): Promise<CardHolderHint> {
    return this.prisma.cardHolderHint.upsert({
      where: { accountId_cardLast4: { accountId, cardLast4 } },
      create: { userId, accountId, cardLast4, personId },
      update: { personId },
    })
  }
}
