import { z } from 'zod'
import { centsSchema, idSchema } from './common'

// Gasto fixo mensal (aluguel, internet...): sem `month` próprio — conta todo mês até ser arquivado
// (03-regras-negocio § Orçamento mensal).
export const fixedExpenseSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    amountCents: centsSchema,
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type FixedExpense = z.infer<typeof fixedExpenseSchema>

export const createFixedExpenseInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe um nome.').max(80),
    amountCents: centsSchema.positive('Informe um valor maior que zero.'),
  })
  .strict()
export type CreateFixedExpenseInput = z.infer<typeof createFixedExpenseInputSchema>

export const updateFixedExpenseInputSchema = createFixedExpenseInputSchema
export type UpdateFixedExpenseInput = CreateFixedExpenseInput
