import {
  createTransactionInputSchema,
  transactionSchema,
  updateTransactionCategoryInputSchema,
  updateTransactionDisplayNameInputSchema,
  updateTransactionPersonInputSchema,
} from './transaction'

const VALID = {
  id: '11111111-1111-1111-1111-111111111111',
  accountId: '22222222-2222-2222-2222-222222222222',
  kind: 'EXPENSE',
  status: 'POSTED',
  amountCents: 1500,
  occurredAt: '2026-09-21T12:00:00.000Z',
  description: 'PAG*LOJA',
  merchant: null,
  categoryId: null,
  categorySuggestedId: null,
  categorySuggestionConfidence: null,
  personId: null,
  note: null,
  cardLast4: null,
  installmentNumber: null,
  installmentTotal: null,
  installmentDueAt: null,
  displayName: null,
  createdAt: '2026-09-21T12:00:00.000Z',
  splits: [],
}

describe('transactionSchema', () => {
  it('aceita a forma completa', () => {
    expect(transactionSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(transactionSchema.safeParse({ ...VALID, userId: 'x' }).success).toBe(false)
  })

  it('rejeita kind ou status fora do enum', () => {
    expect(transactionSchema.safeParse({ ...VALID, kind: 'PIX' }).success).toBe(false)
    expect(transactionSchema.safeParse({ ...VALID, status: 'DONE' }).success).toBe(false)
  })
})

describe('updateTransactionPersonInputSchema', () => {
  it('alwaysForMerchant e alwaysForCard são opcionais, padrão false', () => {
    const result = updateTransactionPersonInputSchema.safeParse({ personId: VALID.id })
    expect(result.success).toBe(true)
    expect(result.success && result.data.alwaysForMerchant).toBe(false)
    expect(result.success && result.data.alwaysForCard).toBe(false)
  })

  it('aceita os dois juntos (não são exclusivos)', () => {
    const result = updateTransactionPersonInputSchema.safeParse({
      personId: VALID.id,
      alwaysForMerchant: true,
      alwaysForCard: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita personId inválido e campo extra', () => {
    expect(updateTransactionPersonInputSchema.safeParse({ personId: 'não-é-uuid' }).success).toBe(false)
    expect(updateTransactionPersonInputSchema.safeParse({ personId: VALID.id, note: 'x' }).success).toBe(false)
  })
})

describe('updateTransactionCategoryInputSchema', () => {
  it('alwaysForMerchant é opcional, padrão false', () => {
    const result = updateTransactionCategoryInputSchema.safeParse({ categoryId: VALID.id })
    expect(result.success).toBe(true)
    expect(result.success && result.data.alwaysForMerchant).toBe(false)
  })

  it('rejeita categoryId inválido e campo extra', () => {
    expect(updateTransactionCategoryInputSchema.safeParse({ categoryId: 'não-é-uuid' }).success).toBe(false)
    expect(updateTransactionCategoryInputSchema.safeParse({ categoryId: VALID.id, note: 'x' }).success).toBe(false)
  })
})

describe('createTransactionInputSchema', () => {
  const BASE = {
    accountId: VALID.accountId,
    kind: 'EXPENSE' as const,
    amountCents: 1500,
    occurredAt: '2026-09-21',
    description: 'Compra',
  }

  it('aceita a forma mínima, com data pura', () => {
    expect(createTransactionInputSchema.safeParse(BASE).success).toBe(true)
  })

  it('aceita datetime completo em occurredAt', () => {
    expect(createTransactionInputSchema.safeParse({ ...BASE, occurredAt: '2026-09-21T23:10:00.000Z' }).success).toBe(
      true,
    )
  })

  it('rejeita data de calendário que não existe (nunca "rola" pro próximo mês por engano)', () => {
    expect(createTransactionInputSchema.safeParse({ ...BASE, occurredAt: '2026-02-30' }).success).toBe(false)
    expect(createTransactionInputSchema.safeParse({ ...BASE, occurredAt: '2026-13-01' }).success).toBe(false)
    expect(createTransactionInputSchema.safeParse({ ...BASE, occurredAt: '2026-04-31' }).success).toBe(false)
  })

  it('aceita 29 de fevereiro só em ano bissexto', () => {
    expect(createTransactionInputSchema.safeParse({ ...BASE, occurredAt: '2028-02-29' }).success).toBe(true)
    expect(createTransactionInputSchema.safeParse({ ...BASE, occurredAt: '2026-02-29' }).success).toBe(false)
  })

  it('rejeita valor zero ou negativo', () => {
    expect(createTransactionInputSchema.safeParse({ ...BASE, amountCents: 0 }).success).toBe(false)
    expect(createTransactionInputSchema.safeParse({ ...BASE, amountCents: -100 }).success).toBe(false)
  })

  it('rejeita kind fora de EXPENSE/INCOME e descrição vazia', () => {
    expect(createTransactionInputSchema.safeParse({ ...BASE, kind: 'REFUND' }).success).toBe(false)
    expect(createTransactionInputSchema.safeParse({ ...BASE, description: '  ' }).success).toBe(false)
  })

  it('categoryId/personId são opcionais, mas rejeitam id inválido quando vêm', () => {
    expect(createTransactionInputSchema.safeParse(BASE).success).toBe(true)
    expect(createTransactionInputSchema.safeParse({ ...BASE, personId: 'não-é-uuid' }).success).toBe(false)
  })
})

describe('updateTransactionDisplayNameInputSchema', () => {
  it('aceita um nome (aparado) ou null para limpar', () => {
    expect(updateTransactionDisplayNameInputSchema.parse({ displayName: '  Air fryer ' })).toEqual({
      displayName: 'Air fryer',
    })
    expect(updateTransactionDisplayNameInputSchema.parse({ displayName: null })).toEqual({ displayName: null })
  })

  it('rejeita nome vazio, com mais de 60 caracteres ou campo extra', () => {
    expect(updateTransactionDisplayNameInputSchema.safeParse({ displayName: '   ' }).success).toBe(false)
    expect(updateTransactionDisplayNameInputSchema.safeParse({ displayName: 'a'.repeat(61) }).success).toBe(false)
    expect(updateTransactionDisplayNameInputSchema.safeParse({ displayName: null, extra: 1 }).success).toBe(false)
  })
})
