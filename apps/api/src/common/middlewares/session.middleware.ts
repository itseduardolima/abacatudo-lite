import { Injectable, type NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { NextFunction, Response } from 'express'
import { AuthService } from '../../modules/auth/auth.service'
import { sessionCookieOptions } from '../session-cookie'
import { SESSION_COOKIE, type RequestWithUser } from '../types/request'
import { userStorage } from '../user-context'

// Resolve a sessão ANTES do AuthGuard e do handler, e é quem estabelece o contexto do
// AsyncLocalStorage — um Guard não consegue fazer isso para o que vem depois dele (ver o comentário em
// AuthGuard). Nunca lança: cookie ausente/inválido só significa "sem userId"; quem decide se a rota
// exige isso é o AuthGuard. Registrado em app.module.ts, antes de tudo que não seja @Public().
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  async use(request: RequestWithUser, response: Response, next: NextFunction): Promise<void> {
    const token = (request.cookies as Record<string, string | undefined> | undefined)?.[SESSION_COOKIE]
    if (!token) {
      next()
      return
    }

    const resolved = await this.auth.resolveSession(token)
    if (!resolved) {
      next()
      return
    }

    request.userId = resolved.userId
    request.sessionId = resolved.sessionId
    // Janela deslizante: renova o Max-Age do cookie a cada request autenticado, reaproveitando o mesmo
    // token (só o servidor sabe quando a sessão de fato expira — o cookie é só o transporte).
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config))

    userStorage.run({ userId: resolved.userId }, () => next())
  }
}
