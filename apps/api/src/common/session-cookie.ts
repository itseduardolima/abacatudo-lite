import type { ConfigService } from '@nestjs/config'
import type { CookieOptions } from 'express'

// Único ponto que decide os flags do cookie de sessão — usado pelo AuthController (login/logout) e pelo
// SessionMiddleware (renovação da janela deslizante), para nunca divergir entre os dois.
export function sessionCookieOptions(config: ConfigService): CookieOptions {
  const idleDays = config.get<number>('SESSION_IDLE_DAYS', 30)
  return {
    httpOnly: true,
    // Sempre true, inclusive em desenvolvimento: __Host- exige Secure, e o navegador trata
    // http://localhost como contexto seguro (08-seguranca § 4 — sem exceção nem em dev).
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: idleDays * 24 * 60 * 60 * 1000,
  }
}
