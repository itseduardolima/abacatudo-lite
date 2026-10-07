import { Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import { normalizeMerchant } from '../rule/normalize-merchant'

export interface UncategorizedTransaction {
  id: string
  merchant: string | null
  description: string
  amountCents: number
  occurredAt: Date
}

export interface MerchantSuggestion {
  categoryId: string
  confidence: number
}

const MAX_BATCH = 40
const MERCHANT_CACHE_LOOKBACK = 500

@Injectable()
export class CategorySuggestionRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findUncategorized(userId: string): Promise<UncategorizedTransaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        cancelledAt: null,
        kind: 'EXPENSE',
        account: { type: 'CREDIT_CARD' },
        categoryId: null,
        categorySuggestedId: null,
      },
      select: { id: true, merchant: true, description: true, amountCents: true, occurredAt: true },
      orderBy: { occurredAt: 'desc' },
      take: MAX_BATCH,
    })
  }

  async findMerchantSuggestion(userId: string, normalizedMerchant: string): Promise<MerchantSuggestion | null> {
    const rows = await this.prisma.transaction.findMany({
      where: { userId, account: { type: 'CREDIT_CARD' }, categorySuggestedId: { not: null }, merchant: { not: null } },
      select: { merchant: true, categorySuggestedId: true, categorySuggestionConfidence: true },
      orderBy: { occurredAt: 'desc' },
      take: MERCHANT_CACHE_LOOKBACK,
    })
    const match = rows.find((row) => row.merchant !== null && normalizeMerchant(row.merchant) === normalizedMerchant)
    if (!match?.categorySuggestedId || match.categorySuggestionConfidence === null) return null
    return { categoryId: match.categorySuggestedId, confidence: match.categorySuggestionConfidence }
  }

  applySuggestion(
    userId: string,
    id: string,
    input: { categoryId: string | null; categorySuggestedId: string; confidence: number },
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.transaction.updateMany({
      where: { userId, id },
      data: {
        categoryId: input.categoryId,
        categorySuggestedId: input.categorySuggestedId,
        categorySuggestionConfidence: input.confidence,
      },
    })
  }
}
