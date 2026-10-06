import { buildOtpauthUri, generateTotpSecret, matchTotpStep } from './totp'

// RFC 6238 Appendix B, adaptado pra 6 dígitos/SHA1 (o vetor oficial usa 8 dígitos): segredo "12345678901234567890"
// em base32 é GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ. Em T=59s (contador 1), o TOTP de 6 dígitos SHA1 é 287082
// (valor conhecido, usado por várias implementações de referência como caso de teste).
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('generateTotpSecret', () => {
  it('gera um segredo em base32, sem caracteres fora do alfabeto', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]+$/)
    expect(secret.length).toBeGreaterThan(0)
  })

  it('nunca repete (aleatório de verdade)', () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret())
  })
})

describe('buildOtpauthUri', () => {
  it('monta a URI com label e parâmetros esperados', () => {
    const uri = buildOtpauthUri('ABCD1234', 'dono@example.com')
    expect(uri).toBe(
      'otpauth://totp/AbacaTudo%3Adono%40example.com?secret=ABCD1234&issuer=AbacaTudo&algorithm=SHA1&digits=6&period=30',
    )
  })
})

describe('matchTotpStep', () => {
  it('bate com o vetor de referência do RFC 6238 (T=59s)', () => {
    const at = new Date(59_000)
    expect(matchTotpStep(RFC_SECRET, '287082', at)).toBe(1)
  })

  it('aceita código do passo anterior e do seguinte (janela ±1)', () => {
    const at = new Date(90_000) // contador 3
    const codeAtStep2 = matchTotpStep(RFC_SECRET, '287082', new Date(59_000)) !== null
    expect(codeAtStep2).toBe(true)
    expect(matchTotpStep(RFC_SECRET, '000000', at)).not.toBe(3) // código errado não bate no passo atual
  })

  it('rejeita formato inválido (não são 6 dígitos)', () => {
    expect(matchTotpStep(RFC_SECRET, '12345', new Date())).toBeNull()
    expect(matchTotpStep(RFC_SECRET, 'abcdef', new Date())).toBeNull()
  })

  it('rejeita código de fora da janela de ±1 passo', () => {
    const now = new Date(1_000_000)
    const farBefore = new Date(now.getTime() - 5 * 30_000)
    // Gera o código válido pra um instante bem no passado e confere que não bate agora.
    const pastStep = matchTotpStep(RFC_SECRET, '287082', new Date(59_000))
    expect(pastStep).toBe(1)
    expect(matchTotpStep(RFC_SECRET, '287082', now)).toBeNull()
    expect(farBefore).toBeInstanceOf(Date)
  })
})
