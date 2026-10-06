import { z } from 'zod'

// Dinheiro: sempre centavos inteiros (04-padroes-codigo § Nomenclatura), nunca decimal.
export const centsSchema = z.number().int()

export const idSchema = z.string().uuid()

// Formato único de erro da API (08-seguranca § 9): nunca stack, tabela ou SQL.
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})
export type ApiError = z.infer<typeof apiErrorSchema>

export const healthSchema = z.object({ status: z.literal('ok') })
export type Health = z.infer<typeof healthSchema>
