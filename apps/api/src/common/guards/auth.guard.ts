import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PUBLIC_KEY } from '../decorators/public.decorator'
import { UnauthorizedError } from '../errors/domain.error'
import type { RequestWithUser } from '../types/request'

// Global e FECHADO por padrão: toda rota que não for @Public() exige um userId já resolvido no request.
// A resolução em si (cookie -> hash -> Session válida -> userId no AsyncLocalStorage) acontece no
// SessionMiddleware, que roda antes deste guard — um Guard não consegue estabelecer o contexto do
// AsyncLocalStorage para o handler que vem depois dele (canActivate() resolve antes do pipeline
// continuar), só uma Middleware, que envolve o `next()` de dentro do `.run()` (08-seguranca § 1).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (!request.userId) throw new UnauthorizedError()
    return true
  }
}
