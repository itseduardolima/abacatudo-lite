import { accountInvoiceSchema, invoiceSchema, statementsResponseSchema } from './invoice'

describe('invoiceSchema', () => {
  it('aceita a forma completa', () => {
    expect(invoiceSchema.safeParse({ totalCents: 200000, mineCents: 130000, notMineCents: 70000 }).success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(invoiceSchema.safeParse({ totalCents: 0, mineCents: 0, notMineCents: 0, aClassificar: 0 }).success).toBe(
      false,
    )
  })
})

describe('accountInvoiceSchema', () => {
  const base = {
    totalCents: 100,
    mineCents: 60,
    notMineCents: 40,
    advancePaidCents: 0,
    isForecast: true,
  }

  it('aceita mês AAAA-MM ou null em lastForecastMonth', () => {
    expect(accountInvoiceSchema.safeParse({ ...base, lastForecastMonth: '2027-05' }).success).toBe(true)
    expect(accountInvoiceSchema.safeParse({ ...base, lastForecastMonth: null }).success).toBe(true)
  })

  it('recusa mês fora do formato e campo desconhecido', () => {
    expect(accountInvoiceSchema.safeParse({ ...base, lastForecastMonth: '2027-13' }).success).toBe(false)
    expect(accountInvoiceSchema.safeParse({ ...base, lastForecastMonth: null, extra: 1 }).success).toBe(false)
  })
})

describe('statementsResponseSchema', () => {
  const statement = { personId: '3f9c6f2e-0a53-4f7a-9a52-6d3f6f0d4a11', personName: 'Ana', totalCents: 4500, text: 'x' }

  it('aceita a resposta com mês AAAA-MM e uma mensagem por pessoa', () => {
    expect(
      statementsResponseSchema.safeParse({ month: '2026-09', isForecast: false, statements: [statement] }).success,
    ).toBe(true)
  })

  it('recusa mês fora do formato e campo desconhecido', () => {
    expect(statementsResponseSchema.safeParse({ month: '2026-13', isForecast: false, statements: [] }).success).toBe(
      false,
    )
    expect(
      statementsResponseSchema.safeParse({
        month: '2026-09',
        isForecast: false,
        statements: [{ ...statement, phone: '1' }],
      }).success,
    ).toBe(false)
  })
})
