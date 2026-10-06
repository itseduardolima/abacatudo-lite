import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super('DATA_ENCRYPTION_KEY não configurada.')
  }
}

function keyFromHex(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, 'hex')
  if (key.length !== 32) throw new EncryptionNotConfiguredError()
  return key
}

// AES-256-GCM (08-seguranca § 9): cada valor com IV único, nunca reaproveitado — vai junto do payload
// (iv + authTag + ciphertext, tudo em base64) porque o IV não é segredo, só precisa nunca repetir pra
// mesma chave. Sem `hexKey` (dev/teste sem DATA_ENCRYPTION_KEY), lança — quem chama decide o fallback.
export function encrypt(plaintext: string, hexKey: string): string {
  const key = keyFromHex(hexKey)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

export function decrypt(payload: string, hexKey: string): string {
  const key = keyFromHex(hexKey)
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, IV_LENGTH)
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
