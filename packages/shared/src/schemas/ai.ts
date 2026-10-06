import { z } from 'zod'

export const suggestCategoriesOutcomeSchema = z
  .object({
    status: z.enum(['DISABLED', 'BUDGET_EXCEEDED', 'NOTHING_TO_DO', 'AI_UNAVAILABLE', 'DONE']),
    suggested: z.number().int().nonnegative().optional(),
    appliedFromCache: z.number().int().nonnegative().optional(),
  })
  .strict()
export type SuggestCategoriesOutcome = z.infer<typeof suggestCategoriesOutcomeSchema>
