import { Injectable, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import { Prisma } from '@prisma/client'
import type { ChangePasswordInput, CurrentUser, LoginInput, UpdateProfileInput } from '@gastos/shared'
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../common/errors/domain.error'
import { assertStrongPassword } from '../../common/security/password-policy'
import { runAsUser } from '../../common/user-context'
import { PersonRepository } from '../person/person.repository'
import { AuthRepository, type SessionRow } from './auth.repository'
import { LoginAttemptTracker } from './login-attempt.tracker'
import { PasswordResetService } from './password-reset.service'
import { generateSessionToken, hashSessionToken } from './token.util'
import { TwoFactorService } from './two-factor.service'

export type LoginResult =
  { status: 'OK'; token: string; user: CurrentUser } | { status: 'MFA_REQUIRED'; mfaToken: string }

export interface LoginMeta {
  ip: string
  userAgent: string | null
}

export interface ResolvedSession {
  userId: string
  sessionId: string
}

export class TooManyAttemptsError extends DomainError {
  constructor() {
    super('TOO_MANY_ATTEMPTS', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429)
  }
}

// Mensagem sempre genérica — nunca diferenciar "e-mail não existe" de "senha errada" (08-seguranca § 4).
const INVALID_CREDENTIALS = () => new UnauthorizedError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
const EMAIL_IN_USE = () => new ConflictError('EMAIL_IN_USE', 'Já existe uma conta com esse e-mail.')
const INVALID_CURRENT_PASSWORD = () =>
  new UnauthorizedError('INVALID_CURRENT_PASSWORD', 'A senha atual está incorreta.')

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

@Injectable()
export class AuthService implements OnModuleInit {
  // Hash fictício verificado quando o e-mail não existe, para o tempo de resposta não revelar quais
  // contas são reais (08-seguranca § 4: "tempo de resposta equalizado").
  private dummyHash = ''
  private readonly idleDays: number

  constructor(
    private readonly repo: AuthRepository,
    private readonly attempts: LoginAttemptTracker,
    private readonly people: PersonRepository,
    private readonly passwordReset: PasswordResetService,
    private readonly twoFactor: TwoFactorService,
    config: ConfigService,
  ) {
    this.idleDays = config.get<number>('SESSION_IDLE_DAYS', 30)
  }

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash('a-password-that-never-matches-anything', { type: argon2.argon2id })
  }

  async login(input: LoginInput, meta: LoginMeta): Promise<LoginResult> {
    const emailKey = `email:${input.email}`
    const ipKey = `ip:${meta.ip}`
    if (this.attempts.isLocked(emailKey) || this.attempts.isLocked(ipKey)) throw new TooManyAttemptsError()

    const user = await this.repo.findUserForLogin(input.email)
    const hash = user?.passwordHash ?? this.dummyHash
    const passwordMatches = await argon2.verify(hash, input.password)

    if (!user || !passwordMatches) {
      this.attempts.recordFailure(emailKey)
      this.attempts.recordFailure(ipKey)
      throw INVALID_CREDENTIALS()
    }
    // Só a chave do e-mail é resetada aqui — nunca a do IP. Resetar o IP a cada login bem-sucedido
    // permitiria a um atacante com UMA conta válida "limpar" o bloqueio por IP a qualquer momento (login
    // legítimo na própria conta, repita as tentativas contra outras contas), esvaziando a defesa por IP
    // exigida por 03-regras-negocio.md § Autenticação. O contador do IP só expira pela janela de tempo.
    this.attempts.reset(emailKey)

    // 2FA ligado: senha certa não basta — cria um desafio de curta duração em vez da Session de verdade
    // (08-seguranca § 4, "o 2FA é pedido no login"). loginWithTwoFactor troca esse desafio por uma Session
    // depois do código bater.
    if (user.totpEnabledAt) {
      const mfaToken = await this.twoFactor.createChallenge(user.id)
      return { status: 'MFA_REQUIRED', mfaToken }
    }

    return { status: 'OK', ...(await this.createSessionResult(user.id, user.email, meta)) }
  }

  async loginWithTwoFactor(mfaToken: string, code: string, meta: LoginMeta): Promise<LoginResult> {
    const userId = await this.twoFactor.verifyChallenge(mfaToken, code)
    const user = await this.repo.findUserById(userId)
    if (!user) throw new UnauthorizedError('INVALID_SESSION', 'Sessão inválida. Faça login novamente.')
    return { status: 'OK', ...(await this.createSessionResult(user.id, user.email, meta)) }
  }

  private async createSessionResult(
    userId: string,
    email: string,
    meta: LoginMeta,
  ): Promise<{ token: string; user: CurrentUser }> {
    const { token, tokenHash } = generateSessionToken()
    await this.repo.createSession({ userId, tokenHash, userAgent: meta.userAgent })
    // Sem sessão ainda no AsyncLocalStorage neste ponto (é o login que está criando ela) — Person tem RLS,
    // então precisa declarar o usuário explicitamente pra essa leitura, mesmo padrão do seed/jobs.
    const name = await runAsUser(userId, () => this.selfName(userId))
    return { token, user: { id: userId, email, name } }
  }

  // Chamado pelo SessionMiddleware a cada request; nunca lança — sessão inválida só significa "sem
  // contexto", quem decide se isso é um problema é o AuthGuard (rota pública x fechada).
  async resolveSession(token: string): Promise<ResolvedSession | null> {
    const session = await this.repo.findValidSession(hashSessionToken(token), this.idleCutoff())
    if (!session) return null
    await this.repo.touchSession(session.id)
    return { userId: session.userId, sessionId: session.id }
  }

  async logout(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId)
  }

  async me(userId: string): Promise<CurrentUser> {
    const user = await this.repo.findUserById(userId)
    if (!user) throw new UnauthorizedError('INVALID_SESSION', 'Sessão inválida. Faça login novamente.')
    return { ...user, name: await this.selfName(userId) }
  }

  listSessions(userId: string): Promise<SessionRow[]> {
    return this.repo.listActiveSessions(userId, this.idleCutoff())
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.repo.revokeSessionForUser(sessionId, userId)
    if (result.count === 0) throw new NotFoundError('SESSION_NOT_FOUND', 'Sessão não encontrada.')
  }

  // "Meu perfil": nome (Person isSelf) + e-mail (User) num formulário só, mas duas fontes por baixo —
  // AuthRepository.updateProfile já cobre as duas na mesma transação.
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<CurrentUser> {
    const existing = await this.repo.findUserByEmail(input.email)
    if (existing && existing.id !== userId) throw EMAIL_IN_USE()

    try {
      const user = await this.repo.updateProfile(userId, { email: input.email, name: input.name })
      return { ...user, name: input.name }
    } catch (error) {
      // Corrida: dois updates concorrentes pro mesmo e-mail passam pela checagem acima antes de um dos
      // dois gravar — quem perde a corrida esbarra na constraint única do banco, não num 500.
      if (isUniqueViolation(error)) throw EMAIL_IN_USE()
      throw error
    }
  }

  // Trocar senha exige a atual (formulário/endpoint separado do perfil — regra de segurança diferente) e
  // derruba toda sessão aberta em outro dispositivo, mantendo só a de quem trocou (sessionId da própria
  // request, nunca escolhido pelo cliente — mesma garantia de logout/revokeSession).
  async changePassword(userId: string, sessionId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.repo.findUserWithPasswordById(userId)
    if (!user) throw new UnauthorizedError('INVALID_SESSION', 'Sessão inválida. Faça login novamente.')

    const currentMatches = await argon2.verify(user.passwordHash, input.currentPassword)
    if (!currentMatches) throw INVALID_CURRENT_PASSWORD()

    assertStrongPassword(input.newPassword)
    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id })
    await this.repo.updatePassword(userId, passwordHash)
    await this.repo.revokeAllSessions(userId, sessionId)
  }

  // Sempre resolve, exista ou não a conta — nunca revela se o e-mail existe (08-seguranca § 4).
  async forgotPassword(email: string): Promise<void> {
    const user = await this.repo.findUserForLogin(email)
    if (!user) return
    await this.passwordReset.sendResetLink({ id: user.id, email: user.email })
  }

  inspectResetToken(token: string) {
    return this.passwordReset.inspect(token)
  }

  resetPassword(token: string, newPassword: string): Promise<void> {
    return this.passwordReset.resetPassword(token, newPassword)
  }

  twoFactorStatus(userId: string) {
    return this.twoFactor.status(userId)
  }

  async startTwoFactorSetup(userId: string) {
    const user = await this.repo.findUserById(userId)
    if (!user) throw new UnauthorizedError('INVALID_SESSION', 'Sessão inválida. Faça login novamente.')
    return this.twoFactor.startSetup(userId, user.email)
  }

  confirmTwoFactorSetup(userId: string, code: string) {
    return this.twoFactor.confirmSetup(userId, code)
  }

  disableTwoFactor(userId: string, password: string): Promise<void> {
    return this.twoFactor.disable(userId, password)
  }

  private async selfName(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    return self?.name ?? 'Eu'
  }

  private idleCutoff(): Date {
    return new Date(Date.now() - this.idleDays * 24 * 60 * 60 * 1000)
  }
}
