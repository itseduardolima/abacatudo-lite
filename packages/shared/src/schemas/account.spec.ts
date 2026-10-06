import { updateAccountInputSchema } from './account'

describe('updateAccountInputSchema — name', () => {
  it('aceita um nome novo e apara os espaços', () => {
    expect(updateAccountInputSchema.parse({ name: '  Cartão principal  ' })).toEqual({ name: 'Cartão principal' })
  })

  it('rejeita nome vazio (só espaços) ou maior que 80 caracteres', () => {
    expect(updateAccountInputSchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(updateAccountInputSchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false)
  })
})
