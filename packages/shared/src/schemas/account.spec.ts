import { createAccountInputSchema, updateAccountInputSchema } from './account'

describe('createAccountInputSchema', () => {
  it('aceita um cartão de crédito com os campos próprios dele', () => {
    const parsed = createAccountInputSchema.safeParse({
      name: 'Nubank',
      type: 'CREDIT_CARD',
      closingDay: 20,
      dueDay: 27,
      creditLimitCents: 500000,
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita closingDay/dueDay/creditLimitCents numa conta que não é cartão de crédito', () => {
    expect(
      createAccountInputSchema.safeParse({ name: 'Conta corrente', type: 'CHECKING', closingDay: 10 }).success,
    ).toBe(false)
    expect(createAccountInputSchema.safeParse({ name: 'Carteira', type: 'CASH', creditLimitCents: 1000 }).success).toBe(
      false,
    )
  })

  it('aceita conta corrente e carteira sem os campos de cartão', () => {
    expect(createAccountInputSchema.safeParse({ name: 'Conta corrente', type: 'CHECKING' }).success).toBe(true)
    expect(createAccountInputSchema.safeParse({ name: 'Carteira', type: 'CASH' }).success).toBe(true)
  })

  it('rejeita source PLUGGY vindo do cliente (só o sync pode setar isso, Sprint 6)', () => {
    expect(createAccountInputSchema.safeParse({ name: 'Nubank', type: 'CREDIT_CARD', source: 'PLUGGY' }).success).toBe(
      false,
    )
  })

  it('source é MANUAL por padrão', () => {
    const parsed = createAccountInputSchema.parse({ name: 'Nubank', type: 'CREDIT_CARD' })
    expect(parsed.source).toBe('MANUAL')
  })

  it('rejeita dia do mês fora de 1-31 e campo extra', () => {
    expect(createAccountInputSchema.safeParse({ name: 'Nubank', type: 'CREDIT_CARD', closingDay: 32 }).success).toBe(
      false,
    )
    expect(createAccountInputSchema.safeParse({ name: 'Nubank', type: 'CREDIT_CARD', userId: 'outro' }).success).toBe(
      false,
    )
  })

  it('rejeita nome vazio', () => {
    expect(createAccountInputSchema.safeParse({ name: '  ', type: 'CASH' }).success).toBe(false)
  })
})

describe('updateAccountInputSchema — name', () => {
  it('aceita um nome novo e apara os espaços', () => {
    expect(updateAccountInputSchema.parse({ name: '  Cartão principal  ' })).toEqual({ name: 'Cartão principal' })
  })

  it('rejeita nome vazio (só espaços) ou maior que 80 caracteres', () => {
    expect(updateAccountInputSchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(updateAccountInputSchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false)
  })
})
