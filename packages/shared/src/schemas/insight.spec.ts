import {
  spendingBreakdownItemSchema,
  spendingReportSchema,
  subscriptionItemSchema,
  subscriptionReportSchema,
} from './insight'

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    key: 'cat-1',
    label: 'Mercado',
    amountCents: 12000,
    previousMonthCents: 10000,
    vsPreviousMonthPercent: 20,
    averageLast3MonthsCents: 8000,
    vsAverageLast3MonthsPercent: 50,
    aboveNormal: false,
    ...overrides,
  }
}

describe('spendingBreakdownItemSchema', () => {
  it('aceita a forma completa', () => {
    expect(spendingBreakdownItemSchema.safeParse(item()).success).toBe(true)
  })

  it('aceita percentuais nulos (sem base de comparação)', () => {
    const result = spendingBreakdownItemSchema.safeParse(
      item({ vsPreviousMonthPercent: null, vsAverageLast3MonthsPercent: null }),
    )
    expect(result.success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(spendingBreakdownItemSchema.safeParse(item({ extra: 1 })).success).toBe(false)
  })
})

describe('spendingReportSchema', () => {
  it('aceita a forma completa', () => {
    const result = spendingReportSchema.safeParse({
      month: '2026-09',
      totalCents: 50000,
      throughDay: 21,
      byCategory: [item()],
      byMerchant: [item({ key: 'loja-x', label: 'Loja X' })],
      byPerson: [item({ key: 'person-1', label: 'Eu' })],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita campo extra', () => {
    const result = spendingReportSchema.safeParse({
      month: '2026-09',
      totalCents: 0,
      throughDay: null,
      byCategory: [],
      byMerchant: [],
      byPerson: [],
      extra: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('subscriptionReportSchema', () => {
  const sub = (overrides: Partial<Record<string, unknown>> = {}) => ({
    key: 'netflix',
    label: 'Netflix',
    monthlyCents: 5590,
    yearlyCents: 67080,
    chargeDay: 8,
    lastChargeAt: '2026-09-08T15:00:00.000Z',
    occurrences: 3,
    ...overrides,
  })

  it('aceita a forma completa', () => {
    const result = subscriptionReportSchema.safeParse({
      totalMonthlyCents: 5590,
      totalYearlyCents: 67080,
      items: [sub()],
    })
    expect(result.success).toBe(true)
  })

  it('exige pelo menos 3 ocorrências', () => {
    expect(subscriptionItemSchema.safeParse(sub({ occurrences: 2 })).success).toBe(false)
  })

  it('rejeita campo extra', () => {
    expect(subscriptionItemSchema.safeParse(sub({ extra: 1 })).success).toBe(false)
  })
})
