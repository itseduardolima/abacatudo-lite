import { z } from 'zod'
import { centsSchema, idSchema } from './common'

export const splitItemSchema = z.object({ personId: idSchema, amountCents: centsSchema.positive() }).strict()
export type SplitItem = z.infer<typeof splitItemSchema>

// Dividir entre menos de 2 pessoas não é divisão — pra 1 pessoa só, use corrigir a pessoa
// (03-regras-negocio § Atribuição de pessoa).
export const updateTransactionSplitInputSchema = z.object({ splits: z.array(splitItemSchema).min(2) }).strict()
export type UpdateTransactionSplitInput = z.infer<typeof updateTransactionSplitInputSchema>

export const previewSplitInputSchema = z.object({ personIds: z.array(idSchema).min(2) }).strict()
export type PreviewSplitInput = z.infer<typeof previewSplitInputSchema>

export const splitPreviewSchema = z.object({ splits: z.array(splitItemSchema) }).strict()
export type SplitPreview = z.infer<typeof splitPreviewSchema>
