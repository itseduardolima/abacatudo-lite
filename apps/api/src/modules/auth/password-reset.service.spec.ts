import type { ConfigService } from '@nestjs/config'
import type { MailService } from '../mail/mail.service'
import type { AuthRepository, ResetTokenRow } from './auth.repository'
import { PasswordResetService } from './password-reset.service'
import { hashSessionToken } from './token.util'

function repoMock() {
  return {
    createResetToken: jest.fn(),
    findResetToken: jest.fn(),
    consumeResetToken: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>
}

function mailMock() {
  return { send: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<MailService>
}

function configMock() {
  return { get: jest.fn().mockReturnValue('http://localhost:3000') } as unknown as ConfigService
}

function row(overrides: Partial<ResetTokenRow> = {}): ResetTokenRow {
  return {
    id: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    userEmail: 'a@b.com',
    ...overrides,
  }
}

describe('PasswordResetService.sendResetLink', () => {
  it('gera um token de uso único (32 bytes), grava só o hash e manda o link por e-mail', async () => {
    const repo = repoMock()
    const mail = mailMock()
    const service = new PasswordResetService(repo, mail, configMock())

    await service.sendResetLink({ id: 'user-1', email: 'a@b.com' })

    expect(repo.createResetToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', expiresAt: expect.any(Date) }),
    )
    const call = repo.createResetToken.mock.calls[0]![0]
    const [message] = mail.send.mock.calls[0] as [{ to: string; text: string }]
    // O e-mail nunca contém o hash guardado — só o token bruto (dentro do link), que nunca é persistido.
    expect(message.text).not.toContain(call.tokenHash)
    expect(message.to).toBe('a@b.com')
    const linkMatch = /token=([^\s]+)/.exec(message.text)
    expect(linkMatch).not.toBeNull()
    expect(hashSessionToken(linkMatch![1]!)).toBe(call.tokenHash)
  })

  it('o token expira em ~1 hora', async () => {
    const repo = repoMock()
    const service = new PasswordResetService(repo, mailMock(), configMock())
    const before = Date.now()

    await service.sendResetLink({ id: 'user-1', email: 'a@b.com' })

    const { expiresAt } = repo.createResetToken.mock.calls[0]![0]
    expect(expiresAt.getTime() - before).toBeGreaterThan(59 * 60 * 1000)
    expect(expiresAt.getTime() - before).toBeLessThan(61 * 60 * 1000)
  })
})

describe('PasswordResetService.inspect', () => {
  it('token válido: devolve o e-mail da conta', async () => {
    const repo = repoMock()
    repo.findResetToken.mockResolvedValue(row())
    const service = new PasswordResetService(repo, mailMock(), configMock())

    await expect(service.inspect('token-bruto')).resolves.toEqual({ email: 'a@b.com' })
  })

  it('token inexistente, usado ou expirado: INVALID_TOKEN, nunca revela detalhe', async () => {
    const repo = repoMock()
    const service = new PasswordResetService(repo, mailMock(), configMock())

    repo.findResetToken.mockResolvedValue(null)
    await expect(service.inspect('x')).rejects.toMatchObject({ code: 'INVALID_TOKEN' })

    repo.findResetToken.mockResolvedValue(row({ usedAt: new Date() }))
    await expect(service.inspect('x')).rejects.toMatchObject({ code: 'INVALID_TOKEN' })

    repo.findResetToken.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1000) }))
    await expect(service.inspect('x')).rejects.toMatchObject({ code: 'INVALID_TOKEN' })
  })
})

describe('PasswordResetService.resetPassword', () => {
  it('token válido e senha forte: consome o token com a senha nova hasheada', async () => {
    const repo = repoMock()
    repo.findResetToken.mockResolvedValue(row())
    const service = new PasswordResetService(repo, mailMock(), configMock())

    await service.resetPassword('token-bruto', 'senha-nova-123456')

    expect(repo.consumeResetToken).toHaveBeenCalledWith('token-1', 'user-1', expect.any(String))
    const [, , passwordHash] = repo.consumeResetToken.mock.calls[0] as [string, string, string]
    expect(passwordHash).not.toBe('senha-nova-123456')
  })

  it('senha fraca: rejeita antes de consumir o token', async () => {
    const repo = repoMock()
    repo.findResetToken.mockResolvedValue(row())
    const service = new PasswordResetService(repo, mailMock(), configMock())

    await expect(service.resetPassword('token-bruto', 'curta')).rejects.toMatchObject({ code: 'WEAK_PASSWORD' })
    expect(repo.consumeResetToken).not.toHaveBeenCalled()
  })

  it('token inválido: rejeita antes de checar a senha', async () => {
    const repo = repoMock()
    repo.findResetToken.mockResolvedValue(null)
    const service = new PasswordResetService(repo, mailMock(), configMock())

    await expect(service.resetPassword('token-bruto', 'senha-nova-123456')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    })
  })
})
