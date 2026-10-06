import { z } from 'zod'
import { centsSchema, idSchema } from './common'

// Só CREDIT_CARD é gerenciada (categoria, pessoa, orçamento); CHECKING/CASH são movimentação, só consulta
// (03-regras-negocio § Escopo).
export const accountTypeSchema = z.enum(['CREDIT_CARD', 'CHECKING', 'CASH'])
export type AccountType = z.infer<typeof accountTypeSchema>

export const accountSourceSchema = z.enum(['MANUAL', 'IMPORT', 'PLUGGY'])
export type AccountSource = z.infer<typeof accountSourceSchema>

const dayOfMonthSchema = z.number().int().min(1).max(31)

// Só os logos servidos localmente em brand/bancos/ (DESIGN_SYSTEM § Logos de bancos) — nunca string
// livre, pra nunca apontar pra uma imagem que não existe em /bancos/*.svg.
export const bankLogoSchema = z.enum(['nubank', 'banco-do-brasil', 'picpay', 'infinitepay'])
export type BankLogo = z.infer<typeof bankLogoSchema>

export const accountSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    type: accountTypeSchema,
    source: accountSourceSchema,
    closingDay: z.number().int().nullable(),
    closedBillCents: z.number().int().nullable(),
    dueDay: z.number().int().nullable(),
    creditLimitCents: centsSchema.nullable(),
    // Saldo sincronizado pelo Pluggy (Fase 4, TODO.md) — sempre null pra conta MANUAL/IMPORT.
    balanceCents: centsSchema.nullable(),
    // Marca manual do usuário: "renda de benefícios" usa o saldo desta conta em vez do valor digitado
    // à mão (Fase 4). Só uma conta por usuário fica marcada por vez.
    isBenefitAccount: z.boolean(),
    // Marca manual do usuário — sem escolha, cai no monograma (avatar Fog com iniciais).
    bankLogo: bankLogoSchema.nullable(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    // Última sincronização com o banco (8.6) — sempre null pra conta MANUAL/IMPORT, que não sincroniza.
    lastSyncAt: z.string().datetime().nullable(),
    // Banco desconectado (8.5) — sempre false pra conta MANUAL/IMPORT, que nunca teve PluggyItem. Histórico
    // continua, só marca que não sincroniza mais.
    disconnected: z.boolean(),
    // Conexão bancária (PluggyItem) por trás da conta — é o id que o "atualizar agora" usa. Null pra conta
    // MANUAL/IMPORT.
    bankConnectionId: idSchema.nullable(),
  })
  .strict()
export type Account = z.infer<typeof accountSchema>

// Os campos editáveis hoje (nome, benefício, logo) — todos opcionais, o PATCH só toca no que vier (o resto da conta nunca
// muda depois de criada).
export const accountNameSchema = z.string().trim().min(1, 'Informe um nome para a conta.').max(80)

export const updateAccountInputSchema = z
  .object({
    name: accountNameSchema.optional(),
    isBenefitAccount: z.boolean().optional(),
    bankLogo: bankLogoSchema.nullable().optional(),
    closingDay: dayOfMonthSchema.optional(),
    dueDay: dayOfMonthSchema.optional(),
    closedBillCents: z.number().int().min(0).nullable().optional(),
  })
  .strict()
export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>

// closingDay/dueDay/creditLimitCents só fazem sentido em CREDIT_CARD — a API rejeita se vierem para
// CHECKING/CASH (08-seguranca § 8: mass assignment é sobre aceitar campo que não devia estar ali, não só
// sobre o formato dele).
export const createAccountInputSchema = z
  .object({
    name: accountNameSchema,
    type: accountTypeSchema,
    source: accountSourceSchema.exclude(['PLUGGY']).default('MANUAL'), // PLUGGY só é setado pelo sync (Sprint 6), nunca pelo cliente.
    closingDay: dayOfMonthSchema.optional(),
    dueDay: dayOfMonthSchema.optional(),
    creditLimitCents: centsSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.type !== 'CREDIT_CARD') {
      for (const field of ['closingDay', 'dueDay', 'creditLimitCents'] as const) {
        if (input[field] !== undefined) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Só se aplica a cartão de crédito.' })
        }
      }
    }
  })
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>
