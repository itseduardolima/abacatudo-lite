import type { ConfigService } from '@nestjs/config'
import type { Category } from '@prisma/client'
import type { AiUsageRepository } from './ai-usage.repository'
import { CategorySuggestionService } from './category-suggestion.service'
import type { CategorySuggestionRepository, UncategorizedTransaction } from './category-suggestion.repository'
import type { GroqClient } from './groq.client'
import type { CategoryRepository } from '../category/category.repository'

const USER = 'user-1'

function config(values: Record<string, number> = {}): ConfigService {
  return { get: (key: string, fallback?: unknown) => values[key] ?? fallback } as unknown as ConfigService
}

function groqMock(enabled = true) {
  return { enabled, suggestCategories: jest.fn() } as unknown as jest.Mocked<GroqClient>
}

function repoMock() {
  return {
    findUncategorized: jest.fn().mockResolvedValue([]),
    findMerchantSuggestion: jest.fn().mockResolvedValue(null),
    applySuggestion: jest.fn(),
  } as unknown as jest.Mocked<CategorySuggestionRepository>
}

function categoriesMock(items: Category[] = []) {
  return { findMany: jest.fn().mockResolvedValue(items) } as unknown as jest.Mocked<CategoryRepository>
}

function usageMock(tokensUsed = 0) {
  return {
    tokensUsed: jest.fn().mockResolvedValue(tokensUsed),
    addTokens: jest.fn(),
  } as unknown as jest.Mocked<AiUsageRepository>
}

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: USER,
    name: 'Mercado',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function transaction(overrides: Partial<UncategorizedTransaction> = {}): UncategorizedTransaction {
  return {
    id: 'tx-1',
    merchant: 'Loja X',
    description: 'PAG*LOJA X',
    amountCents: 5000,
    occurredAt: new Date('2026-09-10T12:00:00.000Z'),
    ...overrides,
  }
}

describe('CategorySuggestionService', () => {
  it('desligado sem GROQ_API_KEY', async () => {
    const service = new CategorySuggestionService(groqMock(false), repoMock(), categoriesMock(), usageMock(), config())
    expect(await service.suggestForUser(USER)).toEqual({ status: 'DISABLED' })
  })

  it('pausa ao estourar o orçamento mensal de tokens', async () => {
    const service = new CategorySuggestionService(
      groqMock(),
      repoMock(),
      categoriesMock(),
      usageMock(200_000),
      config({ AI_MONTHLY_TOKEN_BUDGET: 200_000 }),
    )
    expect(await service.suggestForUser(USER)).toEqual({ status: 'BUDGET_EXCEEDED' })
  })

  it('nada pra fazer quando não há transação sem categoria', async () => {
    const service = new CategorySuggestionService(groqMock(), repoMock(), categoriesMock(), usageMock(), config())
    expect(await service.suggestForUser(USER)).toEqual({ status: 'NOTHING_TO_DO' })
  })

  it('reaproveita sugestão já dada pra outra transação do mesmo estabelecimento, sem chamar a IA', async () => {
    const groq = groqMock()
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([transaction()])
    repo.findMerchantSuggestion.mockResolvedValue({ categoryId: 'cat-1', confidence: 90 })

    const service = new CategorySuggestionService(groq, repo, categoriesMock([category()]), usageMock(), config())
    const outcome = await service.suggestForUser(USER)

    expect(outcome).toEqual({ status: 'DONE', suggested: 0, appliedFromCache: 1 })
    expect(groq.suggestCategories).not.toHaveBeenCalled()
    expect(repo.applySuggestion).toHaveBeenCalledWith(USER, 'tx-1', {
      categoryId: 'cat-1',
      categorySuggestedId: 'cat-1',
      confidence: 90,
    })
  })

  it('confiança acima do limiar aplica a categoria direto', async () => {
    const groq = groqMock()
    groq.suggestCategories.mockResolvedValue({
      text: JSON.stringify([{ index: 0, categoryId: 'cat-1', confidence: 90 }]),
      inputTokens: 100,
      outputTokens: 20,
    })
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([transaction()])
    const usage = usageMock()

    const service = new CategorySuggestionService(groq, repo, categoriesMock([category()]), usage, config())
    const outcome = await service.suggestForUser(USER)

    expect(outcome).toEqual({ status: 'DONE', suggested: 1, appliedFromCache: 0 })
    expect(repo.applySuggestion).toHaveBeenCalledWith(USER, 'tx-1', {
      categoryId: 'cat-1',
      categorySuggestedId: 'cat-1',
      confidence: 90,
    })
    expect(usage.addTokens).toHaveBeenCalledWith(USER, expect.any(String), 120)
  })

  it('confiança abaixo do limiar fica só como sugestão, nunca vira categoria efetiva', async () => {
    const groq = groqMock()
    groq.suggestCategories.mockResolvedValue({
      text: JSON.stringify([{ index: 0, categoryId: 'cat-1', confidence: 40 }]),
      inputTokens: 100,
      outputTokens: 20,
    })
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([transaction()])

    const service = new CategorySuggestionService(groq, repo, categoriesMock([category()]), usageMock(), config())
    await service.suggestForUser(USER)

    expect(repo.applySuggestion).toHaveBeenCalledWith(USER, 'tx-1', {
      categoryId: null,
      categorySuggestedId: 'cat-1',
      confidence: 40,
    })
  })

  it('nunca sobrescreve categoria já confirmada: só busca transação sem categoryId', async () => {
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([])
    const service = new CategorySuggestionService(groqMock(), repo, categoriesMock([category()]), usageMock(), config())

    await service.suggestForUser(USER)

    expect(repo.findUncategorized).toHaveBeenCalledWith(USER)
    expect(repo.applySuggestion).not.toHaveBeenCalled()
  })

  it('falha da IA nunca quebra: degrada para "sem sugestão"', async () => {
    const groq = groqMock()
    groq.suggestCategories.mockRejectedValue(new Error('timeout'))
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([transaction()])

    const service = new CategorySuggestionService(groq, repo, categoriesMock([category()]), usageMock(), config())
    const outcome = await service.suggestForUser(USER)

    expect(outcome).toEqual({ status: 'AI_UNAVAILABLE', appliedFromCache: 0 })
    expect(repo.applySuggestion).not.toHaveBeenCalled()
  })

  it('falha da IA não perde o progresso já aplicado pelo cache de estabelecimento', async () => {
    const groq = groqMock()
    groq.suggestCategories.mockRejectedValue(new Error('timeout'))
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([
      transaction({ id: 'tx-1' }),
      transaction({ id: 'tx-2', merchant: 'Loja Y' }),
    ])
    repo.findMerchantSuggestion.mockImplementation((_userId, merchant) =>
      Promise.resolve(merchant === 'loja x' ? { categoryId: 'cat-1', confidence: 90 } : null),
    )

    const service = new CategorySuggestionService(groq, repo, categoriesMock([category()]), usageMock(), config())
    const outcome = await service.suggestForUser(USER)

    expect(outcome).toEqual({ status: 'AI_UNAVAILABLE', appliedFromCache: 1 })
    expect(repo.applySuggestion).toHaveBeenCalledTimes(1)
  })

  it('descarta tool call com categoria de outro User: só usa as categorias que a própria consulta trouxe', async () => {
    const groq = groqMock()
    groq.suggestCategories.mockResolvedValue({
      text: JSON.stringify([{ index: 0, categoryId: 'cat-de-outro-user', confidence: 90 }]),
      inputTokens: 100,
      outputTokens: 20,
    })
    const repo = repoMock()
    repo.findUncategorized.mockResolvedValue([transaction()])

    const service = new CategorySuggestionService(groq, repo, categoriesMock([category()]), usageMock(), config())
    const outcome = await service.suggestForUser(USER)

    expect(outcome).toEqual({ status: 'DONE', suggested: 0, appliedFromCache: 0 })
    expect(repo.applySuggestion).not.toHaveBeenCalled()
  })
})
