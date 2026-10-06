import { z } from 'zod'

// Resposta do Pluggy é `unknown` até passar por aqui (08-seguranca/10-ia): só os campos que usamos, sem
// `.strict()` — o resto que o Pluggy mandar é ignorado, nunca rejeitado.

export const pluggyAuthResponseSchema = z.object({ apiKey: z.string() })

export const pluggyItemStatusSchema = z.enum([
  'WAITING_USER_INPUT',
  'UPDATING',
  'UPDATED',
  'LOGIN_ERROR',
  'OUTDATED',
  'ERROR',
])

export const pluggyItemSchema = z.object({
  id: z.string(),
  status: pluggyItemStatusSchema,
  connector: z.object({ id: z.number(), name: z.string() }),
  consentExpiresAt: z.string().nullable().optional(),
  parameter: z.object({ name: z.string(), data: z.string() }).nullable().optional(),
  // Só existe quando a conexão falhou (LOGIN_ERROR/ERROR) — é o que vira lastErrorCode.
  error: z.object({ code: z.string().nullable().optional() }).nullable().optional(),
})
export type PluggyItem = z.infer<typeof pluggyItemSchema>

export const pluggyAccountSchema = z.object({
  id: z.string(),
  type: z.enum(['BANK', 'CREDIT']),
  name: z.string(),
  // Só existe em BANK (conta de movimentação) — CREDIT tem seu próprio saldo devedor, calculado à parte
  // pelo InvoiceService (fatura), nunca por aqui.
  balance: z.number().nullable().optional(),
  creditData: z
    .object({
      creditLimit: z.number().nullable().optional(),
      balanceCloseDate: z.string().nullable().optional(),
      balanceDueDate: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})
export type PluggyAccount = z.infer<typeof pluggyAccountSchema>

export const pluggyAccountsPageSchema = z.object({
  results: z.array(pluggyAccountSchema),
  page: z.number().optional(),
  totalPages: z.number().optional(),
})

export const pluggyTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(['DEBIT', 'CREDIT']),
  operationType: z.string().nullable().optional(),
  // category/categoryId: o único jeito confiável de saber se é pagamento de fatura (visto na prática —
  // operationType vem "PAGAMENTO" tanto numa compra parcelada quanto no pagamento da fatura).
  category: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  // Sem .default(): o Pluggy sempre manda status; usar default aqui deixaria o campo opcional no tipo
  // inferido (peculiaridade do Zod com objectOutputType), o que não bate com a realidade dos dados.
  status: z.enum(['POSTED', 'PENDING']),
  // Em compra parcelada, `date` é a data da parcela na fatura (pode ser bem no futuro), não a da compra —
  // purchaseDate é a data real da compra.
  date: z.string(),
  description: z.string(),
  // Campo real do Pluggy é businessName, não name (visto na prática) — sem isso, merchant ficava sempre
  // null e "sempre para este estabelecimento" (Rule) não tinha o que casar.
  merchant: z.object({ businessName: z.string().nullable().optional() }).nullable().optional(),
  creditCardMetadata: z
    .object({
      cardNumber: z.string().nullable().optional(),
      totalInstallments: z.number().nullable().optional(),
      installmentNumber: z.number().nullable().optional(),
      billId: z.string().nullable().optional(),
      purchaseDate: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})
export type PluggyTransaction = z.infer<typeof pluggyTransactionSchema>

export const pluggyTransactionsPageSchema = z.object({
  results: z.array(pluggyTransactionSchema),
  next: z.string().nullable().optional(),
})

// Última fatura FECHADA (nunca a aberta — o Pluggy só materializa a fatura depois que ela fecha de
// verdade; confirmado ao vivo contra um Nubank real, comparando com o OFX exportado pelo banco). É o
// "saldo anterior" que o InvoiceService soma com a movimentação local ainda sem billId.
export const pluggyBillSchema = z.object({
  id: z.string(),
  dueDate: z.string(),
  totalAmount: z.number().nullable().optional(),
})
export type PluggyBill = z.infer<typeof pluggyBillSchema>

export const pluggyBillsPageSchema = z.object({
  results: z.array(pluggyBillSchema),
})
