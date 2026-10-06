import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import type { ResetTokenInfo } from '@gastos/shared'
import { DomainError } from '../../common/errors/domain.error'
import { assertStrongPassword } from '../../common/security/password-policy'
import { MailService } from '../mail/mail.service'
import { AuthRepository, type ResetTokenRow } from './auth.repository'
import { generateSessionToken, hashSessionToken } from './token.util'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1h (08-seguranca § 4)

function invalidToken(): DomainError {
  return new DomainError('INVALID_TOKEN', 'Este link não é válido ou já expirou. Peça um novo.', 400)
}

// Serviço à parte do AuthService (mesmo motivo do pdv-web): o mecanismo de token de uso único é uma
// preocupação própria, testável isolada do login/sessão.
@Injectable()
export class PasswordResetService {
  private readonly webOrigin: string

  constructor(
    private readonly repo: AuthRepository,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:3000')
  }

  // Reaproveita o gerador de token de sessão (32 bytes aleatórios + SHA-256, mesmo formato) — é só um
  // token opaco de uso único, o mecanismo é idêntico independente do que ele autoriza.
  async sendResetLink(user: { id: string; email: string }): Promise<void> {
    const { token, tokenHash } = generateSessionToken()
    await this.repo.createResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    })
    const link = `${this.webOrigin}/reset-password?token=${token}`
    await this.mail.send({
      to: user.email,
      subject: 'Redefinir a sua senha do AbacaTudo',
      text: `Olá!\n\nPara escolher uma nova senha, abra este link (vale por 1 hora):\n${link}\n\nSe você não pediu isso, ignore este e-mail: a sua senha continua a mesma.`,
    })
  }

  async inspect(token: string): Promise<ResetTokenInfo> {
    const row = await this.requireUsable(token)
    return { email: row.userEmail }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const row = await this.requireUsable(token)
    assertStrongPassword(newPassword)
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id })
    await this.repo.consumeResetToken(row.id, row.userId, passwordHash)
  }

  private async requireUsable(token: string): Promise<ResetTokenRow> {
    const row = await this.repo.findResetToken(hashSessionToken(token))
    if (!row || row.usedAt !== null || row.expiresAt.getTime() <= Date.now()) throw invalidToken()
    return row
  }
}
