import { z } from 'zod'
import { centsSchema, idSchema } from './common'

// Fatura = Meu + Não é meu, sempre (03-regras-negocio § Só a minha parte).
export const invoiceSchema = z
  .object({ totalCents: centsSchema, mineCents: centsSchema, notMineCents: centsSchema })
  .strict()
export type Invoice = z.infer<typeof invoiceSchema>

// Fatura de um cartão: a mesma conta, mais o que a navegação por mês precisa (03-regras-negocio § Fatura
// prevista). isForecast = mês posterior ao atual, só parcelas já lançadas; lastForecastMonth = último mês
// com parcela naquele cartão (limite da seta "próximo"), null se não há parcela futura.
export const accountInvoiceSchema = z
  .object({
    totalCents: centsSchema,
    mineCents: centsSchema,
    notMineCents: centsSchema,
    isForecast: z.boolean(),
    // Quanto do total é parcela estimada (03-regras-negocio § Fatura prevista); 0 fora de mês futuro.
    estimatedCents: centsSchema,
    lastForecastMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .nullable(),
  })
  .strict()
export type AccountInvoice = z.infer<typeof accountInvoiceSchema>

// Mensagem de conta por pessoa (03-regras-negocio § Mensagem de conta): o texto já vem pronto do backend.
export const personStatementSchema = z
  .object({ personId: idSchema, personName: z.string(), totalCents: centsSchema, text: z.string() })
  .strict()
export type PersonStatement = z.infer<typeof personStatementSchema>

export const statementsResponseSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    isForecast: z.boolean(),
    statements: z.array(personStatementSchema),
  })
  .strict()
export type StatementsResponse = z.infer<typeof statementsResponseSchema>

// Parcelas estimadas de um cartão num mês futuro (BB e Pic Pay não mandam as futuras): mesmo valor e
// vencimento da última parcela conhecida, mês a mês. Nunca gravadas.
export const estimatedInstallmentSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    amountCents: centsSchema,
    installmentNumber: z.number().int().positive(),
    installmentTotal: z.number().int().positive(),
    dueAt: z.string().datetime(),
  })
  .strict()
export type EstimatedInstallment = z.infer<typeof estimatedInstallmentSchema>

export const estimatedInstallmentsResponseSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    totalCents: centsSchema,
    items: z.array(estimatedInstallmentSchema),
  })
  .strict()
export type EstimatedInstallmentsResponse = z.infer<typeof estimatedInstallmentsResponseSchema>
