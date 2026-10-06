import { z } from 'zod'
import { centsSchema, idSchema } from './common'
import { subscriptionReportSchema } from './insight'

// "Não entram no orçamento" (03-regras-negocio § Movimentações) — puramente informativo.
export const movementTotalsSchema = z.object({ incomeCents: centsSchema, expenseCents: centsSchema }).strict()
export type MovementTotals = z.infer<typeof movementTotalsSchema>

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

// Resumo descritivo da conta de benefício (03-regras-negocio § Extrato e relatório da conta de benefício):
// nunca alimenta orçamento nem IA. `pace` só existe no mês atual e com saldo conhecido.
export const movementReportSchema = z
  .object({
    accountId: idSchema,
    month: monthSchema,
    balanceCents: centsSchema.nullable(),
    lastSyncAt: z.string().datetime().nullable(),
    incomeCents: centsSchema,
    expenseCents: centsSchema,
    resultCents: centsSchema,
    pace: z.object({ daysRemaining: z.number().int().nonnegative(), perDayCents: centsSchema }).strict().nullable(),
    daily: z.array(
      z
        .object({
          day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          expenseCents: centsSchema,
          cumulativeExpenseCents: centsSchema,
        })
        .strict(),
    ),
  })
  .strict()
export type MovementReport = z.infer<typeof movementReportSchema>

export const pixRecipientSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    totalCents: centsSchema,
    count: z.number().int().positive(),
    lastAt: z.string().datetime(),
  })
  .strict()
export type PixRecipient = z.infer<typeof pixRecipientSchema>

export const pixRecipientsResponseSchema = z
  .object({ month: monthSchema, totalCents: centsSchema, recipients: z.array(pixRecipientSchema) })
  .strict()
export type PixRecipientsResponse = z.infer<typeof pixRecipientsResponseSchema>

export const frequentEstablishmentSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    count: z.number().int().min(2),
    totalCents: centsSchema,
    lastAt: z.string().datetime(),
  })
  .strict()
export type FrequentEstablishment = z.infer<typeof frequentEstablishmentSchema>

// Gastos que se repetem no benefício (03-regras-negocio § Extrato e relatório da conta de benefício): só
// estabelecimentos, nunca Pix.
export const movementHabitsSchema = z
  .object({
    recurring: subscriptionReportSchema,
    frequent: z.array(frequentEstablishmentSchema),
  })
  .strict()
export type MovementHabits = z.infer<typeof movementHabitsSchema>

export const establishmentSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    count: z.number().int().min(1),
    totalCents: centsSchema,
    lastAt: z.string().datetime(),
  })
  .strict()
export type Establishment = z.infer<typeof establishmentSchema>

// "Para onde vai" (03-regras-negocio § Extrato e relatório da conta de benefício): estabelecimentos + outros
// + Pix + pagamento de fatura = saídas do mês.
export const movementSpendingSchema = z
  .object({
    month: monthSchema,
    totalCents: centsSchema,
    pixCents: centsSchema,
    cardPaymentCents: centsSchema,
    otherCents: centsSchema,
    establishments: z.array(establishmentSchema),
  })
  .strict()
export type MovementSpending = z.infer<typeof movementSpendingSchema>
