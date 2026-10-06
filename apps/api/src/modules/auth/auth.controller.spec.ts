import type { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import type { RequestWithUser } from '../../common/types/request'
import { AuthController } from './auth.controller'
import type { AuthService } from './auth.service'

function authMock() {
  return {
    login: jest.fn(),
    loginWithTwoFactor: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    inspectResetToken: jest.fn(),
    resetPassword: jest.fn(),
    twoFactorStatus: jest.fn(),
    startTwoFactorSetup: jest.fn(),
    confirmTwoFactorSetup: jest.fn(),
    disableTwoFactor: jest.fn(),
  } as unknown as jest.Mocked<AuthService>
}

function configMock() {
  return { get: jest.fn().mockReturnValue(30) } as unknown as ConfigService
}

function responseMock() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as jest.Mocked<Response>
}

describe('AuthController', () => {
  it('login: seta o cookie de sessão e devolve o usuário, nunca o token no corpo', async () => {
    const auth = authMock()
    auth.login.mockResolvedValue({
      status: 'OK',
      token: 'tok-123',
      user: { id: 'user-1', email: 'a@b.com', name: 'Eduardo' },
    })
    const response = responseMock()
    const request = { ip: '203.0.113.5', get: () => 'jest-agent' } as unknown as Request
    const controller = new AuthController(auth, configMock())

    const result = await controller.login({ email: 'a@b.com', password: 'x' }, request, response)

    expect(result).toEqual({ status: 'OK', user: { id: 'user-1', email: 'a@b.com', name: 'Eduardo' } })
    expect(JSON.stringify(result)).not.toContain('tok-123')
    expect(response.cookie).toHaveBeenCalledWith(
      '__Host-gastos_session',
      'tok-123',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('login com 2FA ligado: devolve MFA_REQUIRED, sem setar cookie nenhum', async () => {
    const auth = authMock()
    auth.login.mockResolvedValue({ status: 'MFA_REQUIRED', mfaToken: 'mfa-tok-123' })
    const response = responseMock()
    const request = { ip: '203.0.113.5', get: () => 'jest-agent' } as unknown as Request
    const controller = new AuthController(auth, configMock())

    const result = await controller.login({ email: 'a@b.com', password: 'x' }, request, response)

    expect(result).toEqual({ status: 'MFA_REQUIRED', mfaToken: 'mfa-tok-123' })
    expect(response.cookie).not.toHaveBeenCalled()
  })

  it('login/2fa: código certo seta o cookie de sessão', async () => {
    const auth = authMock()
    auth.loginWithTwoFactor.mockResolvedValue({
      status: 'OK',
      token: 'tok-456',
      user: { id: 'user-1', email: 'a@b.com', name: 'Eduardo' },
    })
    const response = responseMock()
    const request = { ip: '203.0.113.5', get: () => 'jest-agent' } as unknown as Request
    const controller = new AuthController(auth, configMock())

    const result = await controller.loginWithTwoFactor({ mfaToken: 'mfa-tok-123', code: '123456' }, request, response)

    expect(auth.loginWithTwoFactor).toHaveBeenCalledWith('mfa-tok-123', '123456', {
      ip: '203.0.113.5',
      userAgent: 'jest-agent',
    })
    expect(result).toEqual({ status: 'OK', user: { id: 'user-1', email: 'a@b.com', name: 'Eduardo' } })
    expect(response.cookie).toHaveBeenCalledWith(
      '__Host-gastos_session',
      'tok-456',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('logout: revoga a sessão do request e limpa o cookie', async () => {
    const auth = authMock()
    const response = responseMock()
    const request = { sessionId: 'session-1' } as unknown as RequestWithUser
    const controller = new AuthController(auth, configMock())

    await controller.logout(request, response)

    expect(auth.logout).toHaveBeenCalledWith('session-1')
    expect(response.clearCookie).toHaveBeenCalledWith(
      '__Host-gastos_session',
      expect.not.objectContaining({ maxAge: expect.anything() }),
    )
  })

  it('logout sem sessionId no request não chama o Service (nada a revogar), mas ainda limpa o cookie', async () => {
    const auth = authMock()
    const response = responseMock()
    const request = {} as unknown as RequestWithUser
    const controller = new AuthController(auth, configMock())

    await controller.logout(request, response)

    expect(auth.logout).not.toHaveBeenCalled()
    expect(response.clearCookie).toHaveBeenCalled()
  })

  it('me repassa o userId do decorator para o Service', async () => {
    const auth = authMock()
    auth.me.mockResolvedValue({ id: 'user-1', email: 'a@b.com', name: 'Eduardo' })
    const controller = new AuthController(auth, configMock())
    await expect(controller.me('user-1')).resolves.toEqual({ id: 'user-1', email: 'a@b.com', name: 'Eduardo' })
    expect(auth.me).toHaveBeenCalledWith('user-1')
  })

  it('revokeSession repassa userId e o id validado como UUID pelo pipe', async () => {
    const auth = authMock()
    const controller = new AuthController(auth, configMock())
    await controller.revokeSession('user-1', '11111111-1111-1111-1111-111111111111')
    expect(auth.revokeSession).toHaveBeenCalledWith('user-1', '11111111-1111-1111-1111-111111111111')
  })

  it('updateProfile repassa userId e o corpo pro Service', async () => {
    const auth = authMock()
    const controller = new AuthController(auth, configMock())
    await controller.updateProfile('user-1', { name: 'Novo', email: 'novo@b.com' })
    expect(auth.updateProfile).toHaveBeenCalledWith('user-1', { name: 'Novo', email: 'novo@b.com' })
  })

  it('changePassword usa o sessionId do request (nunca do body) pra manter a sessão atual viva', async () => {
    const auth = authMock()
    const controller = new AuthController(auth, configMock())
    const request = { sessionId: 'session-atual' } as unknown as RequestWithUser
    await controller.changePassword('user-1', request, { currentPassword: 'x', newPassword: 'y' })
    expect(auth.changePassword).toHaveBeenCalledWith('user-1', 'session-atual', {
      currentPassword: 'x',
      newPassword: 'y',
    })
  })

  it('forgotPassword/inspectResetToken/resetPassword repassam pro Service, sem exigir sessão', async () => {
    const auth = authMock()
    auth.inspectResetToken.mockResolvedValue({ email: 'a@b.com' })
    const controller = new AuthController(auth, configMock())

    await controller.forgotPassword({ email: 'a@b.com' })
    expect(auth.forgotPassword).toHaveBeenCalledWith('a@b.com')

    await expect(controller.inspectResetToken('tok')).resolves.toEqual({ email: 'a@b.com' })

    await controller.resetPassword({ token: 'tok', newPassword: 'nova-senha-123456' })
    expect(auth.resetPassword).toHaveBeenCalledWith('tok', 'nova-senha-123456')
  })
})
