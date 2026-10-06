import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'
import { DomainError, UnauthorizedError } from '../../common/errors/domain.error'
import { decrypt, encrypt } from '../../common/security/encryption'
import { buildOtpauthUri, generateTotpSecret, matchTotpStep } from '../../common/security/totp'
import { AuthRepository } from './auth.repository'
import { generateSessionToken, hashSessionToken } from './token.util'

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 min (mesma ordem da reautenticação, 08-seguranca § 4)
const RECOVERY_CODE_COUNT = 10

const NOT_CONFIGURED = () =>
  new DomainError('TWO_FACTOR_NOT_CONFIGURED', 'O 2FA não está disponível neste ambiente.', 501)
const NO_PENDING_SETUP = () =>
  new DomainError('TWO_FACTOR_SETUP_NOT_STARTED', 'Comece o setup do 2FA antes de confirmar o código.', 400)
const ALREADY_ENABLED = () =>
  new DomainError('TWO_FACTOR_ALREADY_ENABLED', 'O 2FA já está ligado. Desligue antes de trocar o segredo.', 409)
const INVALID_CODE = () => new UnauthorizedError('TWO_FACTOR_INVALID_CODE', 'Código inválido ou expirado.')
const INVALID_PASSWORD = () => new UnauthorizedError('INVALID_CURRENT_PASSWORD', 'A senha atual está incorreta.')
const INVALID_CHALLENGE = () =>
  new UnauthorizedError('TWO_FACTOR_INVALID_CHALLENGE', 'Sessão de login expirada. Entre com a senha de novo.')

function formatRecoveryCode(raw: Buffer): string {
  const hex = raw.toString('hex')
  return `${hex.slice(0, 5)}-${hex.slice(5, 10)}`
}

function normalizeRecoveryCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '')
}

@Injectable()
export class TwoFactorService {
  private readonly encryptionKey?: string

  constructor(
    private readonly repo: AuthRepository,
    config: ConfigService,
  ) {
    this.encryptionKey = config.get<string>('DATA_ENCRYPTION_KEY')
  }

  async status(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.repo.totpStatus(userId)
    return { enabled: !!user?.totpEnabledAt }
  }

  async startSetup(userId: string, email: string): Promise<{ secret: string; otpauthUri: string }> {
    if (!this.encryptionKey) throw NOT_CONFIGURED()
    // Nunca troca o segredo de um 2FA já ligado sem passar por `disable` (que exige a senha) — senão uma
    // sessão sequestrada assumia o 2FA da vítima só chamando o setup de novo, sem precisar da senha.
    const status = await this.repo.totpStatus(userId)
    if (status?.totpEnabledAt) throw ALREADY_ENABLED()
    const secret = generateTotpSecret()
    await this.repo.startTotpSetup(userId, encrypt(secret, this.encryptionKey))
    return { secret, otpauthUri: buildOtpauthUri(secret, email) }
  }

  async confirmSetup(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    if (!this.encryptionKey) throw NOT_CONFIGURED()
    const user = await this.repo.findUserWithPasswordById(userId)
    if (!user?.totpSecret) throw NO_PENDING_SETUP()

    const secret = decrypt(user.totpSecret, this.encryptionKey)
    if (matchTotpStep(secret, code) === null) throw INVALID_CODE()

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => formatRecoveryCode(randomBytes(5)))
    const hashes = await Promise.all(
      recoveryCodes.map((recoveryCode) => argon2.hash(normalizeRecoveryCode(recoveryCode), { type: argon2.argon2id })),
    )
    await this.repo.confirmTotpSetup(userId, hashes)
    return { recoveryCodes }
  }

  async disable(userId: string, password: string): Promise<void> {
    const user = await this.repo.findUserWithPasswordById(userId)
    if (!user) throw INVALID_PASSWORD()
    const passwordMatches = await argon2.verify(user.passwordHash, password)
    if (!passwordMatches) throw INVALID_PASSWORD()
    await this.repo.disableTotp(userId)
  }

  // Login com 2FA ligado não cria Session direto — cria este desafio de curta duração, trocado por uma
  // Session de verdade só depois do código bater (verifyChallenge).
  async createChallenge(userId: string): Promise<string> {
    const { token, tokenHash } = generateSessionToken()
    await this.repo.createChallenge({ userId, tokenHash, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) })
    return token
  }

  async verifyChallenge(mfaToken: string, code: string): Promise<string> {
    if (!this.encryptionKey) throw NOT_CONFIGURED()
    const challenge = await this.repo.findChallenge(hashSessionToken(mfaToken))
    if (!challenge || challenge.usedAt !== null || challenge.expiresAt.getTime() <= Date.now()) {
      throw INVALID_CHALLENGE()
    }

    const user = await this.repo.findUserWithPasswordById(challenge.userId)
    if (!user?.totpSecret) throw INVALID_CHALLENGE()

    const secret = decrypt(user.totpSecret, this.encryptionKey)
    const step = matchTotpStep(secret, code)
    if (step !== null && (user.totpLastUsedStep === null || step > user.totpLastUsedStep)) {
      await this.repo.updateTotpLastUsedStep(challenge.userId, step)
      await this.repo.consumeChallenge(challenge.id)
      return challenge.userId
    }

    if (await this.tryRecoveryCode(challenge.userId, code)) {
      await this.repo.consumeChallenge(challenge.id)
      return challenge.userId
    }

    throw INVALID_CODE()
  }

  private async tryRecoveryCode(userId: string, code: string): Promise<boolean> {
    const normalized = normalizeRecoveryCode(code)
    if (normalized.length === 0) return false
    const codes = await this.repo.findRecoveryCodes(userId)
    for (const recoveryCode of codes) {
      if (await argon2.verify(recoveryCode.codeHash, normalized)) {
        await this.repo.consumeRecoveryCode(recoveryCode.id)
        return true
      }
    }
    return false
  }
}
