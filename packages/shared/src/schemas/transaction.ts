import { z } from 'zod'
import { centsSchema, idSchema } from './common'
import { splitItemSchema } from './split'

export const transactionKindSchema = z.enum(['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND', 'CARD_PAYMENT'])
export type TransactionKind = z.infer<typeof transactionKindSchema>

export const transactionStatusSchema = z.enum(['POSTED', 'PENDING'])
export type TransactionStatus = z.infer<typeof transactionStatusSchema>
// schema (03-regras-negocio § Escopo, 04-padroes-codigo).
export const transactionSchema = z
  .object({
    id: idSchema,
    accountId: idSchema,
    kind: transactionKindSchema,
    status: transactionStatusSchema,
    amountCents: centsSchema,
    occurredAt: z.string().datetime(),
    description: z.string(),
    merchant: z.string().nullable(),
    categoryId: idSchema.nullable(),
    categorySuggestedId: idSchema.nullable(),
    categorySuggestionConfidence: z.number().int().min(0).max(100).nullable(),
    personId: idSchema.nullable(),
    note: z.string().nullable(),
    cardLast4: z.string().nullable(),
    installmentNumber: z.number().int().nullable(),
    installmentTotal: z.number().int().nullable(),
    // Quando a parcela cai na fatura (a `date` do Pluggy) — null pra compra à vista. É o dia que a fatura
    // prevista mostra, já que occurredAt é o da compra.
    installmentDueAt: z.string().datetime().nullable(),
    // Apelido da compra ("Air fryer"), usado na mensagem de conta; null usa o nome do banco.
    displayName: z.string().nullable(),
    createdAt: z.string().datetime(),
    // Vazio quando a transação não está dividida (personId sozinho decide o dono) — preenchido só depois
    // de um PUT .../split (03-regras-negocio § Só a minha parte).
    splits: z.array(splitItemSchema),
  })
  .strict()
export type Transaction = z.infer<typeof transactionSchema>

// Corrigir a pessoa de uma transação (03-regras-negocio § Atribuição de pessoa). alwaysForMerchant cria/
// atualiza a Rule do estabelecimento — a API rejeita se a transação não tiver merchant identificado.
// alwaysForCard cria/atualiza o CardHolderHint (2.3, cartão adicional/virtual) — a API rejeita se a
// transação não tiver o final do cartão identificado. Os dois podem vir juntos (não são exclusivos), e o
// hint de cartão decide antes da Rule na próxima sincronização (ver 03-regras-negocio § pipeline).
export const updateTransactionPersonInputSchema = z
  .object({
    personId: idSchema,
    alwaysForMerchant: z.boolean().default(false),
    alwaysForCard: z.boolean().default(false),
  })
  .strict()
export type UpdateTransactionPersonInput = z.infer<typeof updateTransactionPersonInputSchema>

// Nome na fatura: vale para todas as parcelas da mesma compra. null volta ao nome do banco.
export const updateTransactionDisplayNameInputSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Informe um nome para a compra.')
      .max(60, 'Use até 60 caracteres.')
      .nullable(),
  })
  .strict()
export type UpdateTransactionDisplayNameInput = z.infer<typeof updateTransactionDisplayNameInputSchema>

// Corrigir a categoria de uma transação (03-regras-negocio § Categorias e regras). Mesma lógica de
// alwaysForMerchant do endpoint de pessoa, na mesma Rule do estabelecimento.
export const updateTransactionCategoryInputSchema = z
  .object({
    categoryId: idSchema,
    alwaysForMerchant: z.boolean().default(false),
  })
  .strict()
export type UpdateTransactionCategoryInput = z.infer<typeof updateTransactionCategoryInputSchema>

// Confere que "AAAA-MM-DD" é uma data de calendário de verdade (nunca só o formato) — sem isso, "2026-02-30"
// passava batido e virava silenciosamente 2 de março (JS "rola" a data em vez de reclamar), e "2026-13-01"
// virava Invalid Date, que só quebrava depois, na hora de gravar (500 em vez do 400 daqui).
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

// Lançamento manual (3.3): só vale pra conta MANUAL/IMPORT (a API rejeita conta PLUGGY — ela é escrita só
// pelo sync). categoryId/personId só fazem sentido em conta CREDIT_CARD (03-regras-negocio § Escopo); a
// API rejeita se vierem numa conta que não é cartão. occurredAt aceita data pura ("AAAA-MM-DD", o que um
// <input type="date"> dá) ou datetime completo — os dois validados como data de calendário real.
export const createTransactionInputSchema = z
  .object({
    accountId: idSchema,
    kind: z.enum(['EXPENSE', 'INCOME']),
    amountCents: centsSchema.positive(),
    occurredAt: z.string().refine((value) => {
      const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
      if (dateOnly) {
        const [, year, month, day] = dateOnly
        return isValidCalendarDate(Number(year), Number(month), Number(day))
      }
      return !Number.isNaN(new Date(value).getTime())
    }, 'Informe uma data válida.'),
    description: z.string().trim().min(1, 'Informe uma descrição.').max(140),
    categoryId: idSchema.optional(),
    personId: idSchema.optional(),
  })
  .strict()
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>
