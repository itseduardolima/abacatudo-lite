import { z } from 'zod'
import { centsSchema } from './common'

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (esperado AAAA-MM).')

// teto variável = renda + benefício − gastos fixos − meta de poupança (03-regras-negocio § Orçamento
// mensal). variableCapCents é calculado, nunca guardado.
export const budgetMonthSchema = z
  .object({
    month: monthKeySchema,
    incomeCents: centsSchema,
    fixedExpensesCents: centsSchema,
    savingsGoalCents: centsSchema,
    variableCapCents: centsSchema,
  })
  .strict()
export type BudgetMonth = z.infer<typeof budgetMonthSchema>

// Ritmo (7.4, 03-regras-negocio § Orçamento mensal): "restante ÷ dias restantes" — calculado sempre no
// backend (dinheiro nunca é calculado no frontend), o front só narra.
export const budgetPaceStatusSchema = z.enum(['ON_TRACK', 'OVER_PACE'])
export type BudgetPaceStatus = z.infer<typeof budgetPaceStatusSchema>

export const budgetPaceSchema = z
  .object({
    month: monthKeySchema,
    capCents: centsSchema,
    spentCents: centsSchema,
    // Gasto nos cartões de crédito, somando todos (fatura do banco de cada um) — inclui o que não é meu.
    cardsMineCents: centsSchema,
    remainingCents: centsSchema,
    daysInMonth: z.number().int().positive(),
    daysElapsed: z.number().int().nonnegative(),
    daysRemaining: z.number().int().nonnegative(),
    expectedByNowCents: centsSchema,
    diffCents: centsSchema,
    status: budgetPaceStatusSchema,
    perDayRemainingCents: centsSchema,
  })
  .strict()
export type BudgetPace = z.infer<typeof budgetPaceSchema>

export const updateBudgetMonthInputSchema = z
  .object({
    incomeCents: centsSchema.nonnegative(),
    fixedExpensesCents: centsSchema.nonnegative(),
    savingsGoalCents: centsSchema.nonnegative(),
  })
  .strict()
export type UpdateBudgetMonthInput = z.infer<typeof updateBudgetMonthInputSchema>
