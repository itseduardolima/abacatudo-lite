import {
  movementSpendingSchema,
  movementReportSchema,
  movementTotalsSchema,
  pixRecipientsResponseSchema,
} from './movement'

describe('movementTotalsSchema', () => {
  it('aceita a forma completa', () => {
    expect(movementTotalsSchema.safeParse({ incomeCents: 50000, expenseCents: 32000 }).success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(movementTotalsSchema.safeParse({ incomeCents: 0, expenseCents: 0, note: 'x' }).success).toBe(false)
  })
})

describe('movementReportSchema', () => {
  const report = {
    accountId: '3f9c6f2e-0a53-4f7a-9a52-6d3f6f0d4a11',
    month: '2026-09',
    balanceCents: 30000,
    lastSyncAt: '2026-09-30T13:00:00.000Z',
    incomeCents: 5000,
    expenseCents: 2000,
    resultCents: 3000,
    pace: { daysRemaining: 20, perDayCents: 1500 },
    daily: [{ day: '2026-09-01', expenseCents: 1000, cumulativeExpenseCents: 1000 }],
  }

  it('aceita o resumo completo e o ritmo nulo', () => {
    expect(movementReportSchema.safeParse(report).success).toBe(true)
    expect(movementReportSchema.safeParse({ ...report, pace: null, balanceCents: null }).success).toBe(true)
  })

  it('recusa dia fora do formato e campo desconhecido', () => {
    expect(movementReportSchema.safeParse({ ...report, daily: [{ ...report.daily[0], day: '01/09' }] }).success).toBe(
      false,
    )
    expect(movementReportSchema.safeParse({ ...report, extra: 1 }).success).toBe(false)
  })
})

describe('pixRecipientsResponseSchema', () => {
  it('aceita a lista de favorecidos e recusa contagem zerada', () => {
    const recipient = {
      key: 'ana souza',
      name: 'Ana Souza',
      totalCents: 1000,
      count: 1,
      lastAt: '2026-09-10T15:00:00.000Z',
    }
    expect(
      pixRecipientsResponseSchema.safeParse({ month: '2026-09', totalCents: 1000, recipients: [recipient] }).success,
    ).toBe(true)
    expect(
      pixRecipientsResponseSchema.safeParse({
        month: '2026-09',
        totalCents: 0,
        recipients: [{ ...recipient, count: 0 }],
      }).success,
    ).toBe(false)
  })
})

describe('movementSpendingSchema', () => {
  const spending = {
    month: '2026-09',
    totalCents: 5000,
    pixCents: 1000,
    cardPaymentCents: 0,
    otherCents: 0,
    establishments: [{ key: 'uber', label: 'UBER', count: 2, totalCents: 4000, lastAt: '2026-09-10T15:00:00.000Z' }],
  }

  it('aceita a resposta completa e recusa campo desconhecido ou contagem zerada', () => {
    expect(movementSpendingSchema.safeParse(spending).success).toBe(true)
    expect(movementSpendingSchema.safeParse({ ...spending, extra: 1 }).success).toBe(false)
    expect(
      movementSpendingSchema.safeParse({
        ...spending,
        establishments: [{ ...spending.establishments[0], count: 0 }],
      }).success,
    ).toBe(false)
  })
})
