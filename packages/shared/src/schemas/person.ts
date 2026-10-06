import { z } from 'zod'
import { idSchema } from './common'

export const personSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    isSelf: z.boolean(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type Person = z.infer<typeof personSchema>

// isSelf nunca é setável pelo cliente — a Person self só é criada pelo seed (03-regras-negocio § Pessoas).
export const createPersonInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe um nome.').max(60),
  })
  .strict()
export type CreatePersonInput = z.infer<typeof createPersonInputSchema>
