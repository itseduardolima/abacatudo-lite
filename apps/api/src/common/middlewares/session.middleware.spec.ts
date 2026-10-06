import type { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import type { AuthService } from '../../modules/auth/auth.service'
import { currentUserId } from '../user-context'
import { SESSION_COOKIE, type RequestWithUser } from '../types/request'
import { SessionMiddleware } from './session.middleware'

function authMock(resolved: { userId: string; sessionId: string } | null) {
  return { resolveSession: jest.fn().mockResolvedValue(resolved) } as unknown as jest.Mocked<AuthService>
}

function configMock() {
  return { get: jest.fn().mockReturnValue(30) } as unknown as ConfigService
}

function requestWith(cookieToken?: string): RequestWithUser {
  return { cookies: cookieToken ? { [SESSION_COOKIE]: cookieToken } : {} } as unknown as RequestWithUser
}

function responseMock() {
  return { cookie: jest.fn() } as unknown as jest.Mocked<Response>
}

describe('SessionMiddleware', () => {
  it('sem cookie: chama next() sem tocar no userId nem no cookie de resposta', async () => {
    const auth = authMock(null)
    const request = requestWith()
    const response = responseMock()
    const next = jest.fn()

    await new SessionMiddleware(auth, configMock()).use(request, response, next)

    expect(auth.resolveSession).not.toHaveBeenCalled()
    expect(request.userId).toBeUndefined()
    expect(response.cookie).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('token inválido/expirado/revogado: chama next() sem estabelecer contexto nem renovar o cookie', async () => {
    const auth = authMock(null)
    const request = requestWith('token-invalido')
    const response = responseMock()
    const next = jest.fn()

    await new SessionMiddleware(auth, configMock()).use(request, response, next)

    expect(request.userId).toBeUndefined()
    expect(response.cookie).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('sessão válida: preenche userId/sessionId no request e renova o cookie com o MESMO token', async () => {
    const auth = authMock({ userId: 'user-1', sessionId: 'session-1' })
    const request = requestWith('token-valido')
    const response = responseMock()
    const next = jest.fn()

    await new SessionMiddleware(auth, configMock()).use(request, response, next)

    expect(request.userId).toBe('user-1')
    expect(request.sessionId).toBe('session-1')
    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      'token-valido',
      expect.objectContaining({ httpOnly: true, secure: true }),
    )
  })

  it('chama next() DENTRO do contexto do userStorage (a pegadinha do await fora do run)', async () => {
    const auth = authMock({ userId: 'user-1', sessionId: 'session-1' })
    const request = requestWith('token-valido')
    const response = responseMock()
    let seenInsideNext: string | undefined

    await new SessionMiddleware(auth, configMock()).use(request, response, () => {
      seenInsideNext = currentUserId()
    })

    expect(seenInsideNext).toBe('user-1')
  })
})
