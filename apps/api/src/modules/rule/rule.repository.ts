import { Inject, Injectable } from '@nestjs/common'
import type { Rule } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class RuleRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string): Promise<Rule[]> {
    return this.prisma.rule.findMany({ where: { userId } })
  }

  // "Sempre para este estabelecimento": uma regra por [userId, merchant]. Pessoa e categoria são upserts
  // independentes na mesma linha — corrigir uma nunca apaga a outra.
  upsertPerson(userId: string, merchant: string, personId: string): Promise<Rule> {
    return this.prisma.rule.upsert({
      where: { userId_merchant: { userId, merchant } },
      create: { userId, merchant, personId },
      update: { personId },
    })
  }

  upsertCategory(userId: string, merchant: string, categoryId: string): Promise<Rule> {
    return this.prisma.rule.upsert({
      where: { userId_merchant: { userId, merchant } },
      create: { userId, merchant, categoryId },
      update: { categoryId },
    })
  }
}
