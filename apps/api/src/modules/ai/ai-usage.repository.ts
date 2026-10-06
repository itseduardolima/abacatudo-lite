import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class AiUsageRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  async tokensUsed(userId: string, month: string): Promise<number> {
    const usage = await this.prisma.aiUsage.findUnique({ where: { userId_month: { userId, month } } })
    return usage?.tokensUsed ?? 0
  }

  async addTokens(userId: string, month: string, tokens: number): Promise<void> {
    await this.prisma.aiUsage.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, tokensUsed: tokens },
      update: { tokensUsed: { increment: tokens } },
    })
  }
}
