import { assertStrongPassword, MIN_PASSWORD_LENGTH, WeakPasswordError } from './password-policy'

describe('assertStrongPassword', () => {
  it('aceita uma senha longa e fora da lista de comuns', () => {
    expect(() => assertStrongPassword('um cavalo azul pula alto')).not.toThrow()
  })

  it(`rejeita senha com menos de ${MIN_PASSWORD_LENGTH} caracteres`, () => {
    expect(() => assertStrongPassword('curta123456')).toThrow(WeakPasswordError)
  })

  it('aceita exatamente no limite mínimo', () => {
    expect(() => assertStrongPassword('x'.repeat(MIN_PASSWORD_LENGTH))).not.toThrow()
  })

  it('rejeita senha da lista de comuns, sem diferenciar maiúscula/minúscula', () => {
    expect(() => assertStrongPassword('123456789012')).toThrow(WeakPasswordError)
    expect(() => assertStrongPassword('AAAAAAAAAAAA')).toThrow(WeakPasswordError)
  })

  it('o erro é 400 WEAK_PASSWORD', () => {
    try {
      assertStrongPassword('curta')
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect(error).toMatchObject({ code: 'WEAK_PASSWORD', statusCode: 400 })
    }
  })
})
