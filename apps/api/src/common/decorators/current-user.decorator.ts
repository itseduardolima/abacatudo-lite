import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import { UnauthorizedError } from '../errors/domain.error'
import type { RequestWithUser } from '../types/request'

// userId já validado pelo SessionMiddleware + AuthGuard — nunca deveria faltar numa rota protegida.
// O throw aqui é rede de segurança, não o caminho esperado.
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const { userId } = ctx.switchToHttp().getRequest<RequestWithUser>()
  if (!userId) throw new UnauthorizedError()
  return userId
})
