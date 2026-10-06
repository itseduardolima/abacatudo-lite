import { z } from 'zod'

export interface CategorySuggestionResult {
  index: number
  categoryId: string
  confidence: number
}

export const CONFIDENCE_THRESHOLD = 70

export function isConfidentEnough(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD
}

const rawItemSchema = z.object({
  index: z.number().int(),
  categoryId: z.string(),
  confidence: z.number().int().min(0).max(100),
})
const rawArraySchema = z.array(z.unknown())
const CODE_FENCE = /^```(?:json)?\s*([\s\S]*?)\s*```$/

function stripCodeFence(text: string): string {
  const match = CODE_FENCE.exec(text.trim())
  return match?.[1] ?? text
}

export function parseAiCategorySuggestions(
  text: string,
  validIndexes: Set<number>,
  validCategoryIds: Set<string>,
): CategorySuggestionResult[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFence(text))
  } catch {
    return []
  }

  const arrayResult = rawArraySchema.safeParse(parsed)
  if (!arrayResult.success) return []

  const results: CategorySuggestionResult[] = []
  const seenIndexes = new Set<number>()
  for (const raw of arrayResult.data) {
    const itemResult = rawItemSchema.safeParse(raw)
    if (!itemResult.success) continue
    const item = itemResult.data
    if (seenIndexes.has(item.index)) continue
    if (!validIndexes.has(item.index)) continue
    if (!validCategoryIds.has(item.categoryId)) continue
    seenIndexes.add(item.index)
    results.push(item)
  }
  return results
}
