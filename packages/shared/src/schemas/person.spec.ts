import { createPersonInputSchema, personSchema } from './person'

describe('createPersonInputSchema', () => {
  it('aceita um nome', () => {
    expect(createPersonInputSchema.safeParse({ name: 'Mãe' }).success).toBe(true)
  })

  it('rejeita nome vazio e nome maior que 60 caracteres', () => {
    expect(createPersonInputSchema.safeParse({ name: '' }).success).toBe(false)
    expect(createPersonInputSchema.safeParse({ name: 'x'.repeat(61) }).success).toBe(false)
  })

  it('rejeita isSelf vindo do cliente (só o seed cria a Person self)', () => {
    expect(createPersonInputSchema.safeParse({ name: 'Mãe', isSelf: true }).success).toBe(false)
  })
})

describe('personSchema', () => {
  it('não tem campo de userId (nunca sai na resposta)', () => {
    expect(Object.keys(personSchema.shape)).not.toContain('userId')
  })
})
