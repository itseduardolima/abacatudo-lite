import { z } from 'zod'
import { idSchema } from './common'

// Lista fixa por seed (03-regras-negocio § Categorias e regras) — sem criar/renomear/arquivar pelo
// cliente, só listar e atribuir numa transação.
export const categorySchema = z
  .object({
    id: idSchema,
    name: z.string(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type Category = z.infer<typeof categorySchema>
