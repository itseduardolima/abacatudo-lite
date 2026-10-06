// Nunca logar senha, token, segredo, cookie, itemId do Pluggy, código TOTP nem documento (08-seguranca § 10).
// Mascarar no logger, sem confiar em "não vou logar isso".
const SENSITIVE_KEY = /pass(word)?|senha|token|secret|authorization|cookie|item_?id|totp|otp|cpf|cnpj|hash/i
const MAX_DEPTH = 6

export const REDACTED = '[redacted]'

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  if (value && typeof value === 'object' && !(value instanceof Error)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(inner, depth + 1)]),
    )
  }
  if (typeof value === 'string') return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, `Bearer ${REDACTED}`)
  return value
}
