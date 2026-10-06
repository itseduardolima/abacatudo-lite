import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const DIGITS = 6
const WINDOW_STEPS = 1 // ±1 passo (08-seguranca § 4)

function base32Encode(buffer: Buffer): string {
  let bits = ''
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0')
  let output = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  const remainder = bits.length % 5
  if (remainder > 0) {
    const lastChunk = bits.slice(bits.length - remainder).padEnd(5, '0')
    output += BASE32_ALPHABET[parseInt(lastChunk, 2)]
  }
  return output
}

function base32Decode(value: string): Buffer {
  const cleaned = value.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const char of cleaned) bits += BASE32_ALPHABET.indexOf(char).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

// Segredo de 20 bytes (160 bits, o padrão RFC 4226/6238) em base32 — formato que todo app autenticador
// (Google Authenticator, Authy, 1Password...) espera.
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

export function buildOtpauthUri(secret: string, email: string, issuer = 'AbacaTudo'): string {
  const label = encodeURIComponent(`${issuer}:${email}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(counterBuffer).digest()
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f
  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff)
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

// Janela de ±1 passo (30s cada, então até ~30-60s de tolerância de relógio) — nunca mais que isso, senão o
// código fica válido tempo demais (08-seguranca § 4). Devolve o passo que bateu (não só true/false): quem
// chama compara com o último passo aceito pra recusar reuso do mesmo código dentro da janela.
export function matchTotpStep(secret: string, code: string, at: Date = new Date()): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const counter = Math.floor(at.getTime() / 1000 / STEP_SECONDS)
  for (let delta = -WINDOW_STEPS; delta <= WINDOW_STEPS; delta++) {
    const step = counter + delta
    const expected = hotp(secret, step)
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return step
  }
  return null
}
