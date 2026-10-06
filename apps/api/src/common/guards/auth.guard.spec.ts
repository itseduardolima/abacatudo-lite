import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Public } from '../decorators/public.decorator'
import { UnauthorizedError } from '../errors/domain.error'
import type { RequestWithUser } from '../types/request'
import { AuthGuard } from './auth.guard'

class Ctrl {
  @Public()
  open() {}
  closed() {}
}

function contextFor(method: 'open' | 'closed', userId?: string): ExecutionContext {
  const request: Partial<RequestWithUser> = userId ? { userId } : {}
  return {
    getHandler: () => Ctrl.prototype[method],
    getClass: () => Ctrl,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
  const guard = new AuthGuard(new Reflector())

  it('deixa passar rota @Public() mesmo sem userId', () => {
    expect(guard.canActivate(contextFor('open'))).toBe(true)
  })

  it('deixa passar rota fechada quando o SessionMiddleware já resolveu o userId', () => {
    expect(guard.canActivate(contextFor('closed', 'user-1'))).toBe(true)
  })

  it('recusa por padrão uma rota sem @Public() e sem userId no request (falha fechada)', () => {
    expect(() => guard.canActivate(contextFor('closed'))).toThrow(UnauthorizedError)
  })

  it('o erro é 401 UNAUTHENTICATED com mensagem em português', () => {
    try {
      guard.canActivate(contextFor('closed'))
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Faça login para continuar.' })
    }
  })
})
