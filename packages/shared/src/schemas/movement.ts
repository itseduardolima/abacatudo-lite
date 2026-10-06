import { z } from 'zod'
import { centsSchema } from './common'

// "Não entram no orçamento" (03-regras-negocio § Movimentações) — puramente informativo.
export const movementTotalsSchema = z.object({ incomeCents: centsSchema, expenseCents: centsSchema }).strict()
export type MovementTotals = z.infer<typeof movementTotalsSchema>
