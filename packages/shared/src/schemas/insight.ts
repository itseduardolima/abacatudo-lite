import { z } from 'zod'
import { centsSchema } from './common'

// null quando não há base de comparação (mês/média anterior zerada) — nunca um percentual inventado.
export const spendingBreakdownItemSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    amountCents: centsSchema,
    previousMonthCents: centsSchema,
    vsPreviousMonthPercent: z.number().int().nullable(),
    averageLast3MonthsCents: centsSchema,
    vsAverageLast3MonthsPercent: z.number().int().nullable(),
    // Só é true na lista por categoria: gasto > 140% da média dos 3 meses anteriores, com histórico dos 3
    // meses (03-regras-negocio § Relatórios e insights).
    aboveNormal: z.boolean(),
  })
  .strict()
export type SpendingBreakdownItem = z.infer<typeof spendingBreakdownItemSchema>

// HU 9.1 — "para onde vai o dinheiro": só compra no cartão (03-regras-negocio § Relatórios e insights).
// totalCents, byCategory e byMerchant são só a parte do dono (mesma regra da fatura); byPerson mostra todas as
// pessoas. Cada lista só traz os agrupamentos com gasto no mês pedido, ordenados do maior pro menor.
// throughDay: no mês corrente, os meses de comparação só contam até esse dia (mesmo período); null quando a
// comparação é de mês inteiro.
export const spendingReportSchema = z
  .object({
    month: z.string(),
    totalCents: centsSchema,
    throughDay: z.number().int().min(1).max(31).nullable(),
    byCategory: z.array(spendingBreakdownItemSchema),
    byMerchant: z.array(spendingBreakdownItemSchema),
    byPerson: z.array(spendingBreakdownItemSchema),
  })
  .strict()
export type SpendingReport = z.infer<typeof spendingReportSchema>

// HU 9.2 — assinaturas e recorrências (03-regras-negocio § Relatórios e insights): mesmo estabelecimento,
// valor semelhante (±10%), intervalo ~30 dias (±4), >= 3 ocorrências, só a parte do dono. O total anual é
// sempre 12x o mensal, calculado no backend.
export const subscriptionItemSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    monthlyCents: centsSchema,
    yearlyCents: centsSchema,
    // Dia do mês da última cobrança ("todo dia 8").
    chargeDay: z.number().int().min(1).max(31),
    lastChargeAt: z.string().datetime(),
    occurrences: z.number().int().min(3),
  })
  .strict()
export type SubscriptionItem = z.infer<typeof subscriptionItemSchema>

export const subscriptionReportSchema = z
  .object({
    totalMonthlyCents: centsSchema,
    totalYearlyCents: centsSchema,
    items: z.array(subscriptionItemSchema),
  })
  .strict()
export type SubscriptionReport = z.infer<typeof subscriptionReportSchema>

// HU 9.3 — cobrança duplicada: mesmo estabelecimento + valor em janela de 24h.
export const duplicateChargeSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    amountCents: centsSchema,
    firstChargeAt: z.string().datetime(),
    secondChargeAt: z.string().datetime(),
  })
  .strict()
export type DuplicateCharge = z.infer<typeof duplicateChargeSchema>

// HU 9.5 — "onde economizar": ranking por potencial (03-regras-negocio § Relatórios e insights), juntando
// cobrança duplicada, categoria acima do normal e assinatura ativa. Cada item traz o cálculo por trás e a
// chave de origem (categoria ou assinatura) pra linkar ao relatório.
export const savingsItemSchema = z
  .object({
    type: z.enum(['DUPLICATE_CHARGE', 'ABOVE_NORMAL_CATEGORY', 'SUBSCRIPTION']),
    label: z.string(),
    amountCents: centsSchema,
    calculation: z.string(),
    sourceKey: z.string(),
  })
  .strict()
export type SavingsItem = z.infer<typeof savingsItemSchema>

export const savingsReportSchema = z
  .object({
    items: z.array(savingsItemSchema),
  })
  .strict()
export type SavingsReport = z.infer<typeof savingsReportSchema>
