import type { Request } from 'express'

// __Host- exige Secure + Path=/ + sem Domain (08-seguranca § 4): o navegador recusa o cookie se qualquer
// flag relaxar, então um erro de configuração falha fechado (o cookie simplesmente não é aceito).
export const SESSION_COOKIE = '__Host-gastos_session'

export interface RequestWithUser extends Request {
  userId?: string
  sessionId?: string
}
