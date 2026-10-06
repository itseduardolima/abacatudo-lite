import { generateSessionToken, hashSessionToken } from './token.util'

describe('token.util', () => {
  it('gera tokens diferentes a cada chamada', () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).not.toBe(b.tokenHash)
  })

  it('o hash é determinístico (o mesmo token sempre gera o mesmo hash)', () => {
    const { token, tokenHash } = generateSessionToken()
    expect(hashSessionToken(token)).toBe(tokenHash)
  })

  it('o hash é SHA-256 em hex (64 caracteres) e nunca contém o token original', () => {
    const { token, tokenHash } = generateSessionToken()
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(tokenHash).not.toContain(token)
  })
})
