import { movementTotalsSchema } from './movement'

describe('movementTotalsSchema', () => {
  it('aceita a forma completa', () => {
    expect(movementTotalsSchema.safeParse({ incomeCents: 50000, expenseCents: 32000 }).success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(movementTotalsSchema.safeParse({ incomeCents: 0, expenseCents: 0, note: 'x' }).success).toBe(false)
  })
})
