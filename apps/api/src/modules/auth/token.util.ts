import { createHash, randomBytes } from 'node:crypto'

// Token opaco de sessão (não JWT): o valor em si nunca é persistido, só o SHA-256 dele (mesmo padrão de
// convite/reset em 08-seguranca § 4) — um dump do banco não entrega nenhuma sessão utilizável.
export function generateSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashSessionToken(token) }
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
