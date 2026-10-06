import { REDACTED, redact } from './redact'

describe('redact', () => {
  it('mascara chaves sensíveis, em qualquer nível', () => {
    const out = redact({
      email: 'a@b.com',
      password: 'x',
      nested: { token: 'y', itemId: 'z', ok: 1 },
      list: [{ secret: 's' }],
    })
    expect(out).toEqual({
      email: 'a@b.com',
      password: REDACTED,
      nested: { token: REDACTED, itemId: REDACTED, ok: 1 },
      list: [{ secret: REDACTED }],
    })
  })

  it('cobre variações de nome (Authorization, cookie, TOTP, CPF, senha)', () => {
    const out = redact({
      Authorization: 'a',
      cookie: 'c',
      totpCode: '1',
      cpf: '2',
      senha: '3',
      passwordHash: '4',
    }) as Record<string, unknown>
    expect(Object.values(out).every((v) => v === REDACTED)).toBe(true)
  })

  it('mascara "Bearer <token>" dentro de texto', () => {
    expect(redact('falhou com Bearer abc.def-123 na chamada')).toBe(`falhou com Bearer ${REDACTED} na chamada`)
  })

  it('não quebra com valores primitivos e limita a profundidade', () => {
    expect(redact(5)).toBe(5)
    expect(redact(null)).toBeNull()
    let deep: Record<string, unknown> = { v: 1 }
    for (let i = 0; i < 12; i++) deep = { inner: deep }
    expect(JSON.stringify(redact(deep))).toContain(REDACTED)
  })
})
