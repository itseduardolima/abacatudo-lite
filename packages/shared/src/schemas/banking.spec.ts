import {
  bankConnectionSchema,
  bankConnectionStatusSchema,
  connectBankResponseSchema,
  registerBankItemInputSchema,
} from './banking'

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
  it('exige um connectToken não vazio e rejeita campo extra', () => {
    expect(connectBankResponseSchema.safeParse({ connectToken: 'jwt' }).success).toBe(true)
    expect(connectBankResponseSchema.safeParse({ connectToken: '' }).success).toBe(false)
    expect(connectBankResponseSchema.safeParse({ connectToken: 'jwt', id: 'x' }).success).toBe(false)
  })
})

describe('registerBankItemInputSchema', () => {
  it('exige pluggyItemId; replacesId é opcional e precisa ser um id válido', () => {
    expect(registerBankItemInputSchema.safeParse({ pluggyItemId: 'abc' }).success).toBe(true)
    expect(registerBankItemInputSchema.safeParse({}).success).toBe(false)
    expect(registerBankItemInputSchema.safeParse({ pluggyItemId: '' }).success).toBe(false)
    expect(
      registerBankItemInputSchema.safeParse({
        pluggyItemId: 'abc',
        replacesId: '11111111-1111-1111-1111-111111111111',
      }).success,
    ).toBe(true)
    expect(registerBankItemInputSchema.safeParse({ pluggyItemId: 'abc', replacesId: 'nao-e-id' }).success).toBe(false)
  })
})
