import type { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import { Prisma } from '@prisma/client'
import { ConflictError, NotFoundError, UnauthorizedError } from '../../common/errors/domain.error'
import type { PersonRepository } from '../person/person.repository'
import type { AuthRepository } from './auth.repository'
import { AuthService, TooManyAttemptsError } from './auth.service'
import { LoginAttemptTracker } from './login-attempt.tracker'
import type { PasswordResetService } from './password-reset.service'
import { hashSessionToken } from './token.util'
import type { TwoFactorService } from './two-factor.service'

function repoMock() {
  return {
    findUserForLogin: jest.fn(),
    findUserById: jest.fn(),
    findUserWithPasswordById: jest.fn(),
    findUserByEmail: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
    createSession: jest.fn(),
    findValidSession: jest.fn(),
    touchSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeSessionForUser: jest.fn(),
    revokeAllSessions: jest.fn(),
    listActiveSessions: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>
}

function twoFactorMock() {
  return {
    status: jest.fn(),
    startSetup: jest.fn(),
    confirmSetup: jest.fn(),
    disable: jest.fn(),
    createChallenge: jest.fn(),
    verifyChallenge: jest.fn(),
  } as unknown as jest.Mocked<TwoFactorService>
}

function peopleMock() {
  return { findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function passwordResetMock() {
  return {
    sendResetLink: jest.fn(),
    inspect: jest.fn(),
    resetPassword: jest.fn(),
  } as unknown as jest.Mocked<PasswordResetService>
}

function configMock(idleDays = 30) {
  return { get: jest.fn().mockReturnValue(idleDays) } as unknown as ConfigService
}

const META = { ip: '203.0.113.10', userAgent: 'jest' }

async function service(
  repo = repoMock(),
  attempts = new LoginAttemptTracker(),
  idleDays = 30,
  people = peopleMock(),
  passwordReset = passwordResetMock(),
  twoFactor = twoFactorMock(),
) {
  const svc = new AuthService(repo, attempts, people, passwordReset, twoFactor, configMock(idleDays))
  await svc.onModuleInit()
  return { svc, repo, attempts, people, passwordReset, twoFactor }
}

describe('AuthService.login', () => {
  it('com credenciais corretas, cria a sessão e devolve token + usuário (sem passwordHash), com o nome da Person isSelf', async () => {
    const passwordHash = await argon2.hash('correct horse battery staple', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    repo.createSession.mockResolvedValue({ id: 'session-1' })
    const people = peopleMock()
    people.findSelf.mockResolvedValue({
      id: 'person-1',
      userId: 'user-1',
      name: 'Eduardo',
      isSelf: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const { svc } = await service(repo, undefined, undefined, people)

    const result = await svc.login({ email: 'a@b.com', password: 'correct horse battery staple' }, META)
    if (result.status !== 'OK') throw new Error('esperava login OK, sem 2FA')

    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com', name: 'Eduardo' })
    expect(result.token).toHaveLength(43) // 32 bytes em base64url
    expect(repo.createSession).toHaveBeenCalledWith({
      userId: 'user-1',
      tokenHash: hashSessionToken(result.token),
      userAgent: 'jest',
    })
  })

  it('sem Person isSelf (nunca deveria acontecer, mas não quebra o login), cai no nome "Eu"', async () => {
    const passwordHash = await argon2.hash('correct horse battery staple', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    repo.createSession.mockResolvedValue({ id: 'session-1' })
    const people = peopleMock()
    people.findSelf.mockResolvedValue(null)
    const { svc } = await service(repo, undefined, undefined, people)

    const result = await svc.login({ email: 'a@b.com', password: 'correct horse battery staple' }, META)
    if (result.status !== 'OK') throw new Error('esperava login OK, sem 2FA')
    expect(result.user.name).toBe('Eu')
  })

  it('senha errada: erro genérico, sem dizer que o e-mail existe', async () => {
    const passwordHash = await argon2.hash('a-senha-certa', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    const { svc } = await service(repo)

    await expect(svc.login({ email: 'a@b.com', password: 'errada' }, META)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos.',
      statusCode: 401,
    })
  })

  it('e-mail inexistente: mesmo erro genérico, e ainda assim faz um argon2.verify (tempo equalizado)', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const verifySpy = jest.spyOn(argon2, 'verify')
    const { svc } = await service(repo)

    await expect(svc.login({ email: 'nao-existe@b.com', password: 'qualquer' }, META)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(verifySpy).toHaveBeenCalled()
    verifySpy.mockRestore()
  })

  it('bloqueia depois de 5 falhas do mesmo e-mail, mesmo trocando de IP', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc } = await service(repo)

    for (let i = 0; i < 5; i++) {
      await svc
        .login({ email: 'alvo@b.com', password: 'x' }, { ip: `10.0.0.${i}`, userAgent: null })
        .catch(() => undefined)
    }

    await expect(
      svc.login({ email: 'alvo@b.com', password: 'x' }, { ip: '10.0.0.99', userAgent: null }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError)
  })

  it('bloqueia depois de 5 falhas do mesmo IP, mesmo trocando de e-mail', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc } = await service(repo)

    for (let i = 0; i < 5; i++) {
      await svc.login({ email: `alvo${i}@b.com`, password: 'x' }, META).catch(() => undefined)
    }

    await expect(svc.login({ email: 'outro@b.com', password: 'x' }, META)).rejects.toBeInstanceOf(TooManyAttemptsError)
  })

  it('login correto reseta o contador de falhas anteriores', async () => {
    const passwordHash = await argon2.hash('a-senha-certa', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    repo.createSession.mockResolvedValue({ id: 'session-1' })
    const { svc, attempts } = await service(repo)

    for (let i = 0; i < 4; i++) {
      repo.findUserForLogin.mockResolvedValueOnce({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash,
        totpSecret: null,
        totpEnabledAt: null,
        totpLastUsedStep: null,
      })
      await svc.login({ email: 'a@b.com', password: 'errada' }, META).catch(() => undefined)
    }
    await svc.login({ email: 'a@b.com', password: 'a-senha-certa' }, META)

    expect(attempts.isLocked('email:a@b.com')).toBe(false)
  })

  it('login bem-sucedido NÃO reseta o contador do IP (evita bypass do bloqueio por IP via login legítimo em outra conta)', async () => {
    const passwordHash = await argon2.hash('a-senha-certa', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc, attempts } = await service(repo)

    // 4 tentativas falhas contra e-mails de OUTRAS pessoas, do mesmo IP do atacante.
    for (let i = 0; i < 4; i++) {
      await svc.login({ email: `vitima${i}@b.com`, password: 'x' }, META).catch(() => undefined)
    }

    // O atacante faz login de verdade na PRÓPRIA conta, pelo mesmo IP.
    repo.findUserForLogin.mockResolvedValueOnce({
      id: 'user-1',
      email: 'atacante@b.com',
      passwordHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    repo.createSession.mockResolvedValueOnce({ id: 'session-1' })
    await svc.login({ email: 'atacante@b.com', password: 'a-senha-certa' }, META)

    // Se o contador do IP tivesse sido resetado pelo login legítimo, esta 5ª falha (contra mais uma
    // vítima) não bloquearia. O IP precisa continuar bloqueado assim que chegar ao limite de novo.
    repo.findUserForLogin.mockResolvedValue(null)
    await svc.login({ email: 'vitima-nova@b.com', password: 'x' }, META).catch(() => undefined)

    expect(attempts.isLocked(`ip:${META.ip}`)).toBe(true)
  })
})

describe('AuthService.resolveSession', () => {
  it('sessão válida: toca lastUsedAt e devolve userId + sessionId', async () => {
    const repo = repoMock()
    repo.findValidSession.mockResolvedValue({ id: 'session-1', userId: 'user-1' })
    const { svc } = await service(repo)

    await expect(svc.resolveSession('token-qualquer')).resolves.toEqual({ userId: 'user-1', sessionId: 'session-1' })
    expect(repo.touchSession).toHaveBeenCalledWith('session-1')
  })

  it('sessão inexistente, revogada ou expirada (fora da janela idle): devolve null, nunca lança', async () => {
    const repo = repoMock()
    repo.findValidSession.mockResolvedValue(null)
    const { svc } = await service(repo)

    await expect(svc.resolveSession('token-invalido')).resolves.toBeNull()
    expect(repo.touchSession).not.toHaveBeenCalled()
  })

  it('usa o corte de 30 dias por padrão para calcular a janela idle', async () => {
    const repo = repoMock()
    repo.findValidSession.mockResolvedValue(null)
    const now = Date.parse('2026-09-22T00:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(now)
    const { svc } = await service(repo, new LoginAttemptTracker(), 30)

    await svc.resolveSession('t')

    const [, idleCutoff] = repo.findValidSession.mock.calls[0] as [string, Date]
    expect(idleCutoff.toISOString()).toBe('2026-08-23T00:00:00.000Z')
    jest.restoreAllMocks()
  })
})

describe('AuthService.logout/me/sessions', () => {
  it('logout revoga a sessão informada', async () => {
    const repo = repoMock()
    const { svc } = await service(repo)
    await svc.logout('session-1')
    expect(repo.revokeSession).toHaveBeenCalledWith('session-1')
  })

  it('me devolve o usuário com nome (Person isSelf) e sem passwordHash', async () => {
    const repo = repoMock()
    repo.findUserById.mockResolvedValue({ id: 'user-1', email: 'a@b.com' })
    const people = peopleMock()
    people.findSelf.mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      name: 'Eduardo',
      isSelf: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const { svc } = await service(repo, undefined, undefined, people)
    await expect(svc.me('user-1')).resolves.toEqual({ id: 'user-1', email: 'a@b.com', name: 'Eduardo' })
  })

  it('me lança se o usuário sumiu (ex.: excluído entre requests)', async () => {
    const repo = repoMock()
    repo.findUserById.mockResolvedValue(null)
    const { svc } = await service(repo)
    await expect(svc.me('user-fantasma')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('revokeSession de sessão de outro usuário (ou inexistente) devolve 404, nunca revoga', async () => {
    const repo = repoMock()
    repo.revokeSessionForUser.mockResolvedValue({ count: 0 })
    const { svc } = await service(repo)
    await expect(svc.revokeSession('user-1', 'session-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('revokeSession da própria sessão funciona', async () => {
    const repo = repoMock()
    repo.revokeSessionForUser.mockResolvedValue({ count: 1 })
    const { svc } = await service(repo)
    await expect(svc.revokeSession('user-1', 'session-1')).resolves.toBeUndefined()
    expect(repo.revokeSessionForUser).toHaveBeenCalledWith('session-1', 'user-1')
  })

  it('listSessions repassa para a Repository', async () => {
    const repo = repoMock()
    repo.listActiveSessions.mockResolvedValue([])
    const { svc } = await service(repo)
    await svc.listSessions('user-1')
    expect(repo.listActiveSessions).toHaveBeenCalledWith('user-1', expect.any(Date))
  })
})

describe('AuthService.updateProfile', () => {
  it('atualiza e-mail (User) e nome (Person isSelf) numa chamada só', async () => {
    const repo = repoMock()
    repo.findUserByEmail.mockResolvedValue(null)
    repo.updateProfile.mockResolvedValue({ id: 'user-1', email: 'novo@b.com' })
    const { svc } = await service(repo)

    const result = await svc.updateProfile('user-1', { name: 'Novo Nome', email: 'novo@b.com' })

    expect(result).toEqual({ id: 'user-1', email: 'novo@b.com', name: 'Novo Nome' })
    expect(repo.updateProfile).toHaveBeenCalledWith('user-1', { email: 'novo@b.com', name: 'Novo Nome' })
  })

  it('e-mail já em uso por outro usuário: 409, nunca grava', async () => {
    const repo = repoMock()
    repo.findUserByEmail.mockResolvedValue({ id: 'outro-user' })
    const { svc } = await service(repo)

    await expect(svc.updateProfile('user-1', { name: 'X', email: 'jauso@b.com' })).rejects.toBeInstanceOf(ConflictError)
    expect(repo.updateProfile).not.toHaveBeenCalled()
  })

  it('e-mail já é o mesmo do próprio usuário: não é conflito', async () => {
    const repo = repoMock()
    repo.findUserByEmail.mockResolvedValue({ id: 'user-1' })
    repo.updateProfile.mockResolvedValue({ id: 'user-1', email: 'a@b.com' })
    const { svc } = await service(repo)

    await expect(svc.updateProfile('user-1', { name: 'X', email: 'a@b.com' })).resolves.toMatchObject({
      email: 'a@b.com',
    })
  })

  it('corrida (dois updates concorrentes pro mesmo e-mail): P2002 também vira 409', async () => {
    const repo = repoMock()
    repo.findUserByEmail.mockResolvedValue(null)
    repo.updateProfile.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'x' }),
    )
    const { svc } = await service(repo)

    await expect(svc.updateProfile('user-1', { name: 'X', email: 'corrida@b.com' })).rejects.toBeInstanceOf(
      ConflictError,
    )
  })
})

describe('AuthService.changePassword', () => {
  it('senha atual certa: grava a nova e derruba as outras sessões, mantendo a atual', async () => {
    const currentHash = await argon2.hash('senha-atual-12345', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserWithPasswordById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash: currentHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    const { svc } = await service(repo)

    await svc.changePassword('user-1', 'session-atual', {
      currentPassword: 'senha-atual-12345',
      newPassword: 'senha-nova-123456',
    })

    expect(repo.updatePassword).toHaveBeenCalledWith('user-1', expect.any(String))
    expect(repo.revokeAllSessions).toHaveBeenCalledWith('user-1', 'session-atual')
  })

  it('senha atual errada: 401, nunca grava nem derruba sessão', async () => {
    const currentHash = await argon2.hash('senha-atual-12345', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserWithPasswordById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash: currentHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    const { svc } = await service(repo)

    await expect(
      svc.changePassword('user-1', 'session-atual', { currentPassword: 'errada', newPassword: 'senha-nova-123456' }),
    ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' })
    expect(repo.updatePassword).not.toHaveBeenCalled()
    expect(repo.revokeAllSessions).not.toHaveBeenCalled()
  })

  it('senha nova fraca: rejeita antes de gravar (mesma regra do seed)', async () => {
    const currentHash = await argon2.hash('senha-atual-12345', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserWithPasswordById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash: currentHash,
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    const { svc } = await service(repo)

    await expect(
      svc.changePassword('user-1', 'session-atual', { currentPassword: 'senha-atual-12345', newPassword: 'curta' }),
    ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' })
    expect(repo.updatePassword).not.toHaveBeenCalled()
  })
})

describe('AuthService.forgotPassword/resetPassword', () => {
  it('e-mail existente: manda o link pelo PasswordResetService', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash: 'x',
      totpSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
    })
    const { svc, passwordReset } = await service(repo)

    await svc.forgotPassword('a@b.com')

    expect(passwordReset.sendResetLink).toHaveBeenCalledWith({ id: 'user-1', email: 'a@b.com' })
  })

  it('e-mail inexistente: resolve sem lançar e sem mandar e-mail (nunca revela se existe)', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc, passwordReset } = await service(repo)

    await expect(svc.forgotPassword('nao-existe@b.com')).resolves.toBeUndefined()
    expect(passwordReset.sendResetLink).not.toHaveBeenCalled()
  })

  it('inspectResetToken/resetPassword repassam pro PasswordResetService', async () => {
    const { svc, passwordReset } = await service()
    passwordReset.inspect.mockResolvedValue({ email: 'a@b.com' })

    await expect(svc.inspectResetToken('token')).resolves.toEqual({ email: 'a@b.com' })
    await svc.resetPassword('token', 'senha-nova-123456')
    expect(passwordReset.resetPassword).toHaveBeenCalledWith('token', 'senha-nova-123456')
  })
})
