import { decrypt, encrypt, EncryptionNotConfiguredError } from './encryption'

const KEY = 'a'.repeat(64) // 32 bytes hex, formato válido (openssl rand -hex 32)
const OTHER_KEY = 'b'.repeat(64)

describe('encrypt/decrypt', () => {
  it('descriptografa o que criptografou', () => {
    const ciphertext = encrypt('segredo-totp-em-base32', KEY)
    expect(decrypt(ciphertext, KEY)).toBe('segredo-totp-em-base32')
  })

  it('nunca produz o mesmo ciphertext duas vezes (IV único)', () => {
    expect(encrypt('mesmo texto', KEY)).not.toBe(encrypt('mesmo texto', KEY))
  })

  it('não descriptografa com a chave errada', () => {
    const ciphertext = encrypt('segredo', KEY)
    expect(() => decrypt(ciphertext, OTHER_KEY)).toThrow()
  })

  it('recusa chave em formato inválido', () => {
    expect(() => encrypt('x', 'chave-curta-demais')).toThrow(EncryptionNotConfiguredError)
  })

  it('detecta payload adulterado (auth tag não bate)', () => {
    const ciphertext = encrypt('segredo', KEY)
    const tampered = Buffer.from(ciphertext, 'base64')
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff
    expect(() => decrypt(tampered.toString('base64'), KEY)).toThrow()
  })
})
