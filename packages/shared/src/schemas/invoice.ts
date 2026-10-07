import { z } from 'zod'
import { centsSchema, idSchema } from './common'

// Fatura = Meu + Não é meu, sempre (03-regras-negocio § Só a minha parte).
export const invoiceSchema = z
  .object({ totalCents: centsSchema, mineCents: centsSchema, notMineCents: centsSchema })
  .strict()
export type Invoice = z.infer<typeof invoiceSchema>

// Fatura de um cartão: a mesma conta, mais o que a navegação por mês precisa (03-regras-negocio § Fatura
// prevista). isForecast = mês posterior ao atual, só parcelas já enviadas pelo banco; lastForecastMonth = último mês
// com parcela naquele cartão (limite da seta "próximo"), null se não há parcela futura.
export const accountInvoiceSchema = z
  .object({
    totalCents: centsSchema,
    mineCents: centsSchema,
    notMineCents: centsSchema,
    isForecast: z.boolean(),
    // Pagamento adiantado já abatido do total (o que passou da fatura fechada); 0 se não houve.
    advancePaidCents: centsSchema,
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
