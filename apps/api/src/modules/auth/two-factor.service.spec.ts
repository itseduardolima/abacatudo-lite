import type { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import { encrypt } from '../../common/security/encryption'
import * as totp from '../../common/security/totp'
import type { AuthRepository } from './auth.repository'
import { TwoFactorService } from './two-factor.service'

jest.mock('../../common/security/totp', () => ({
  ...jest.requireActual('../../common/security/totp'),
  matchTotpStep: jest.fn(),
}))

const KEY = 'a'.repeat(64)
const USER_ID = 'user-1'
const EMAIL = 'dono@example.com'

function config(values: Record<string, string> = { DATA_ENCRYPTION_KEY: KEY }): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService
}

function repoMock() {
  return {
    findUserById: jest.fn(),
    totpStatus: jest.fn(),
    startTotpSetup: jest.fn(),
    confirmTotpSetup: jest.fn(),
    disableTotp: jest.fn(),
    updateTotpLastUsedStep: jest.fn(),
    findRecoveryCodes: jest.fn().mockResolvedValue([]),
    consumeRecoveryCode: jest.fn(),
    createChallenge: jest.fn(),
    findChallenge: jest.fn(),
    consumeChallenge: jest.fn(),
    findUserWithPasswordById: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>
}

const matchTotpStepMock = totp.matchTotpStep as jest.Mock

describe('TwoFactorService', () => {
  beforeEach(() => matchTotpStepMock.mockReset())

  describe('startSetup', () => {
    it('recusa sem DATA_ENCRYPTION_KEY configurada', async () => {
      const service = new TwoFactorService(repoMock(), config({}))
      await expect(service.startSetup(USER_ID, EMAIL)).rejects.toMatchObject({ code: 'TWO_FACTOR_NOT_CONFIGURED' })
    })

    it('gera um segredo, grava cifrado e devolve a otpauth URI', async () => {
      const repo = repoMock()
      const service = new TwoFactorService(repo, config())

      const result = await service.startSetup(USER_ID, EMAIL)

      expect(result.secret).toMatch(/^[A-Z2-7]+$/)
      expect(result.otpauthUri).toContain(encodeURIComponent(EMAIL))
      expect(repo.startTotpSetup).toHaveBeenCalledWith(USER_ID, expect.any(String))
      expect(repo.startTotpSetup.mock.calls[0]?.[1]).not.toBe(result.secret) // nunca em texto puro no banco
    })

    it('2FA já ligado: recusa trocar o segredo sem passar por disable (senha)', async () => {
      const repo = repoMock()
      repo.totpStatus.mockResolvedValue({ totpEnabledAt: new Date() })
      const service = new TwoFactorService(repo, config())

      await expect(service.startSetup(USER_ID, EMAIL)).rejects.toMatchObject({ code: 'TWO_FACTOR_ALREADY_ENABLED' })
      expect(repo.startTotpSetup).not.toHaveBeenCalled()
    })
  })

  describe('confirmSetup', () => {
    it('sem setup pendente (sem totpSecret), recusa', async () => {
      const repo = repoMock()
      repo.findUserWithPasswordById.mockResolvedValue({
        id: USER_ID,
        email: EMAIL,
        passwordHash: 'x',
        totpSecret: null,
        totpEnabledAt: null,
        totpLastUsedStep: null,
      })
      const service = new TwoFactorService(repo, config())

      await expect(service.confirmSetup(USER_ID, '123456')).rejects.toMatchObject({
        code: 'TWO_FACTOR_SETUP_NOT_STARTED',
      })
    })

    it('código errado: recusa, nunca liga o 2FA', async () => {
      const repo = repoMock()
      repo.findUserWithPasswordById.mockResolvedValue({
        id: USER_ID,
        email: EMAIL,
        passwordHash: 'x',
        totpSecret: encrypt('SEGREDO', KEY),
        totpEnabledAt: null,
        totpLastUsedStep: null,
      })
      matchTotpStepMock.mockReturnValue(null)
      const service = new TwoFactorService(repo, config())

      await expect(service.confirmSetup(USER_ID, '000000')).rejects.toMatchObject({ code: 'TWO_FACTOR_INVALID_CODE' })
      expect(repo.confirmTotpSetup).not.toHaveBeenCalled()
    })

    it('código certo: liga o 2FA e devolve 10 códigos de recuperação únicos', async () => {
      const repo = repoMock()
      repo.findUserWithPasswordById.mockResolvedValue({
        id: USER_ID,
        email: EMAIL,
        passwordHash: 'x',
        totpSecret: encrypt('SEGREDO', KEY),
        totpEnabledAt: null,
        totpLastUsedStep: null,
      })
      matchTotpStepMock.mockReturnValue(5)
      const service = new TwoFactorService(repo, config())

      const result = await service.confirmSetup(USER_ID, '123456')

      expect(result.recoveryCodes).toHaveLength(10)
      expect(new Set(result.recoveryCodes).size).toBe(10)
      expect(repo.confirmTotpSetup).toHaveBeenCalledWith(USER_ID, expect.arrayContaining([expect.any(String)]))
      const hashes = repo.confirmTotpSetup.mock.calls[0]?.[1] as string[]
      expect(hashes).toHaveLength(10)
      expect(hashes[0]).not.toBe(result.recoveryCodes[0]) // hash, nunca o código em texto puro
    })
  })

  describe('disable', () => {
    it('senha errada: recusa, nunca desliga', async () => {
      const repo = repoMock()
      const passwordHash = await argon2.hash('senha-certa-123456', { type: argon2.argon2id })
      repo.findUserWithPasswordById.mockResolvedValue({
        id: USER_ID,
        email: EMAIL,
        passwordHash,
        totpSecret: null,
        totpEnabledAt: new Date(),
        totpLastUsedStep: null,
      })
      const service = new TwoFactorService(repo, config())

      await expect(service.disable(USER_ID, 'senha-errada')).rejects.toMatchObject({
        code: 'INVALID_CURRENT_PASSWORD',
      })
      expect(repo.disableTotp).not.toHaveBeenCalled()
    })

    it('senha certa: desliga o 2FA', async () => {
      const repo = repoMock()
      const passwordHash = await argon2.hash('senha-certa-123456', { type: argon2.argon2id })
      repo.findUserWithPasswordById.mockResolvedValue({
        id: USER_ID,
        email: EMAIL,
        passwordHash,
        totpSecret: null,
        totpEnabledAt: new Date(),
        totpLastUsedStep: null,
      })
      const service = new TwoFactorService(repo, config())

      await service.disable(USER_ID, 'senha-certa-123456')

      expect(repo.disableTotp).toHaveBeenCalledWith(USER_ID)
    })
  })

  describe('verifyChallenge', () => {
    function challengeUser(overrides: Partial<{ totpLastUsedStep: number | null }> = {}) {
      return {
        id: USER_ID,
        email: EMAIL,
        passwordHash: 'x',
        totpSecret: encrypt('SEGREDO', KEY),
        totpEnabledAt: new Date(),
        totpLastUsedStep: null,
        ...overrides,
      }
    }

    it('desafio inexistente ou expirado: recusa', async () => {
      const repo = repoMock()
      repo.findChallenge.mockResolvedValue(null)
      const service = new TwoFactorService(repo, config())

      await expect(service.verifyChallenge('tok', '123456')).rejects.toMatchObject({
        code: 'TWO_FACTOR_INVALID_CHALLENGE',
      })
    })

    it('desafio já usado: recusa (uso único)', async () => {
      const repo = repoMock()
      repo.findChallenge.mockResolvedValue({
        id: 'ch-1',
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      })
      const service = new TwoFactorService(repo, config())

      await expect(service.verifyChallenge('tok', '123456')).rejects.toMatchObject({
        code: 'TWO_FACTOR_INVALID_CHALLENGE',
      })
    })

    it('código TOTP certo: consome o desafio e devolve o userId', async () => {
      const repo = repoMock()
      repo.findChallenge.mockResolvedValue({
        id: 'ch-1',
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      })
      repo.findUserWithPasswordById.mockResolvedValue(challengeUser())
      matchTotpStepMock.mockReturnValue(10)
      const service = new TwoFactorService(repo, config())

      const userId = await service.verifyChallenge('tok', '123456')

      expect(userId).toBe(USER_ID)
      expect(repo.updateTotpLastUsedStep).toHaveBeenCalledWith(USER_ID, 10)
      expect(repo.consumeChallenge).toHaveBeenCalledWith('ch-1')
    })

    it('reusa o mesmo código dentro da janela: recusa (proteção contra reuso)', async () => {
      const repo = repoMock()
      repo.findChallenge.mockResolvedValue({
        id: 'ch-1',
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      })
      repo.findUserWithPasswordById.mockResolvedValue(challengeUser({ totpLastUsedStep: 10 }))
      matchTotpStepMock.mockReturnValue(10) // mesmo passo já usado
      const service = new TwoFactorService(repo, config())

      await expect(service.verifyChallenge('tok', '123456')).rejects.toMatchObject({ code: 'TWO_FACTOR_INVALID_CODE' })
      expect(repo.consumeChallenge).not.toHaveBeenCalled()
    })

    it('código TOTP errado mas código de recuperação certo: aceita e queima o código', async () => {
      const repo = repoMock()
      repo.findChallenge.mockResolvedValue({
        id: 'ch-1',
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      })
      repo.findUserWithPasswordById.mockResolvedValue(challengeUser())
      matchTotpStepMock.mockReturnValue(null)
      const recoveryHash = await argon2.hash('abcde12345', { type: argon2.argon2id })
      repo.findRecoveryCodes.mockResolvedValue([{ id: 'rc-1', codeHash: recoveryHash, usedAt: null }])
      const service = new TwoFactorService(repo, config())

      const userId = await service.verifyChallenge('tok', 'ABCDE-12345')

      expect(userId).toBe(USER_ID)
      expect(repo.consumeRecoveryCode).toHaveBeenCalledWith('rc-1')
      expect(repo.consumeChallenge).toHaveBeenCalledWith('ch-1')
    })

    it('nem TOTP nem código de recuperação batem: recusa, sem consumir o desafio', async () => {
      const repo = repoMock()
      repo.findChallenge.mockResolvedValue({
        id: 'ch-1',
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      })
      repo.findUserWithPasswordById.mockResolvedValue(challengeUser())
      matchTotpStepMock.mockReturnValue(null)
      const service = new TwoFactorService(repo, config())

      await expect(service.verifyChallenge('tok', '999999')).rejects.toMatchObject({ code: 'TWO_FACTOR_INVALID_CODE' })
      expect(repo.consumeChallenge).not.toHaveBeenCalled()
    })
  })
})
