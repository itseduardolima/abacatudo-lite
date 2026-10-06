import { bankConnectionSchema, bankConnectionStatusSchema, connectBankResponseSchema } from './banking'

describe('bankConnectionSchema', () => {
  it('aceita a forma completa e rejeita campo extra', () => {
    const valid = {
      id: '11111111-1111-1111-1111-111111111111',
      institutionName: 'Nubank',
      status: 'UPDATED',
      consentExpiresAt: null,
      lastSyncAt: null,
      lastErrorCode: null,
      createdAt: '2026-09-21T12:00:00.000Z',
      reconnectWarningDays: null,
    }
    expect(bankConnectionSchema.safeParse(valid).success).toBe(true)
    expect(bankConnectionSchema.safeParse({ ...valid, pluggyItemId: 'x' }).success).toBe(false)
  })

  it('aceita DISCONNECTED (8.5 — só chega por ação local, nunca vem do Pluggy)', () => {
    expect(bankConnectionStatusSchema.safeParse('DISCONNECTED').success).toBe(true)
  })

  it('reconnectWarningDays só aceita 7, 30 ou null (8.4)', () => {
    const valid = {
      id: '11111111-1111-1111-1111-111111111111',
      institutionName: 'Nubank',
      status: 'UPDATED',
      consentExpiresAt: null,
      lastSyncAt: null,
      lastErrorCode: null,
      createdAt: '2026-09-21T12:00:00.000Z',
    }
    expect(bankConnectionSchema.safeParse({ ...valid, reconnectWarningDays: 7 }).success).toBe(true)
    expect(bankConnectionSchema.safeParse({ ...valid, reconnectWarningDays: 30 }).success).toBe(true)
    expect(bankConnectionSchema.safeParse({ ...valid, reconnectWarningDays: 15 }).success).toBe(false)
  })
})

describe('connectBankResponseSchema', () => {
  it('exige uma URL de verdade em authorizeUrl', () => {
    expect(
      connectBankResponseSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111', authorizeUrl: 'nao-e-url' })
        .success,
    ).toBe(false)
    expect(
      connectBankResponseSchema.safeParse({
        id: '11111111-1111-1111-1111-111111111111',
        authorizeUrl: 'https://my.pluggy.ai/oauth/authorize',
      }).success,
    ).toBe(true)
  })
})
