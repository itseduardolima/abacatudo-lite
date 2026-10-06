import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { dayOfMonth, monthKey } from '../../common/date/timezone'
import { CategoryRepository } from '../category/category.repository'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { AiUsageRepository } from './ai-usage.repository'
import { CategorySuggestionRepository, type UncategorizedTransaction } from './category-suggestion.repository'
import { isConfidentEnough, parseAiCategorySuggestions } from './category-suggestion.mapper'
import { GroqClient, type CategorySuggestionRequestItem } from './groq.client'

export type SuggestCategoriesOutcome =
  | { status: 'DISABLED' | 'BUDGET_EXCEEDED' | 'NOTHING_TO_DO' }
  | { status: 'AI_UNAVAILABLE'; appliedFromCache: number }
  | { status: 'DONE'; suggested: number; appliedFromCache: number }

@Injectable()
export class CategorySuggestionService {
  private readonly logger = new Logger(CategorySuggestionService.name)
  private readonly monthlyBudget: number

  constructor(
    private readonly groq: GroqClient,
    private readonly repo: CategorySuggestionRepository,
    private readonly categories: CategoryRepository,
    private readonly usage: AiUsageRepository,
    config: ConfigService,
  ) {
    this.monthlyBudget = config.get<number>('AI_MONTHLY_TOKEN_BUDGET', 200_000)
  }

  async suggestForUser(userId: string): Promise<SuggestCategoriesOutcome> {
    if (!this.groq.enabled) return { status: 'DISABLED' }

    const month = monthKey(new Date())
    const used = await this.usage.tokensUsed(userId, month)
    if (used >= this.monthlyBudget) return { status: 'BUDGET_EXCEEDED' }

    const transactions = await this.repo.findUncategorized(userId)
    if (transactions.length === 0) return { status: 'NOTHING_TO_DO' }

    let appliedFromCache = 0
    const toAsk: (UncategorizedTransaction & { index: number })[] = []
    for (const transaction of transactions) {
      const cached = transaction.merchant
        ? await this.repo.findMerchantSuggestion(userId, normalizeMerchant(transaction.merchant))
        : null
      if (cached) {
        await this.repo.applySuggestion(userId, transaction.id, {
          categoryId: isConfidentEnough(cached.confidence) ? cached.categoryId : null,
          categorySuggestedId: cached.categoryId,
          confidence: cached.confidence,
        })
        appliedFromCache++
        continue
      }
      toAsk.push({ ...transaction, index: toAsk.length })
    }

    if (toAsk.length === 0) return { status: 'DONE', suggested: 0, appliedFromCache }

    const categories = await this.categories.findMany(userId, false)
    if (categories.length === 0) return { status: 'DONE', suggested: 0, appliedFromCache }

    const items: CategorySuggestionRequestItem[] = toAsk.map((transaction) => ({
      index: transaction.index,
      merchant: transaction.merchant,
      description: transaction.description,
      amountCents: transaction.amountCents,
      dayOfMonth: dayOfMonth(transaction.occurredAt),
    }))

    let text: string
    let tokensUsed: number
    try {
      const response = await this.groq.suggestCategories(
        items,
        categories.map((category) => ({ id: category.id, name: category.name })),
      )
      text = response.text
      tokensUsed = response.inputTokens + response.outputTokens
    } catch (error) {
      this.logger.warn(`Falha ao chamar a IA para sugestão de categoria: ${(error as Error).message}`)
      return { status: 'AI_UNAVAILABLE', appliedFromCache }
    }
    await this.usage.addTokens(userId, month, tokensUsed)

    const validIndexes = new Set(toAsk.map((transaction) => transaction.index))
    const validCategoryIds = new Set(categories.map((category) => category.id))
    const results = parseAiCategorySuggestions(text, validIndexes, validCategoryIds)

    let suggested = 0
    for (const result of results) {
      const transaction = toAsk[result.index]
      if (!transaction) continue
      await this.repo.applySuggestion(userId, transaction.id, {
        categoryId: isConfidentEnough(result.confidence) ? result.categoryId : null,
        categorySuggestedId: result.categoryId,
        confidence: result.confidence,
      })
      suggested++
    }

    return { status: 'DONE', suggested, appliedFromCache }
  }
}
