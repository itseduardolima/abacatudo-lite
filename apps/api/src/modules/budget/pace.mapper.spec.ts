import { computePace } from './pace.mapper'

describe('computePace', () => {
  it('mês atual, no meio: esperado linear até ontem, dias restantes incluem hoje', () => {
    // Setembro tem 30 dias. Hoje é dia 15 → 14 dias já completos (dia 15 ainda não fechou).
    const result = computePace({
      monthKeyValue: '2026-09',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 15,
      capCents: 300_000,
      spentCents: 100_000,
      cardsMineCents: 0,
    })
    expect(result.daysInMonth).toBe(30)
    expect(result.daysElapsed).toBe(14)
    expect(result.daysRemaining).toBe(16)
    expect(result.expectedByNowCents).toBe(Math.round((300_000 * 14) / 30))
    expect(result.remainingCents).toBe(200_000)
  })

  it('gastou menos que o esperado até agora: ON_TRACK, diff positivo', () => {
    const result = computePace({
      monthKeyValue: '2026-09',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 15,
      capCents: 300_000,
      spentCents: 50_000,
      cardsMineCents: 0,
    })
    expect(result.status).toBe('ON_TRACK')
    expect(result.diffCents).toBeGreaterThan(0)
  })

  it('gastou mais que o esperado até agora: OVER_PACE, diff negativo', () => {
    const result = computePace({
      monthKeyValue: '2026-09',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 15,
      capCents: 300_000,
      spentCents: 250_000,
      cardsMineCents: 0,
    })
    expect(result.status).toBe('OVER_PACE')
    expect(result.diffCents).toBeLessThan(0)
  })

  it('mês passado: 100% dos dias elapsed, sem dias restantes', () => {
    const result = computePace({
      monthKeyValue: '2026-08',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 15,
      capCents: 300_000,
      spentCents: 280_000,
      cardsMineCents: 0,
    })
    expect(result.daysElapsed).toBe(result.daysInMonth)
    expect(result.daysRemaining).toBe(0)
    expect(result.expectedByNowCents).toBe(300_000)
    expect(result.perDayRemainingCents).toBe(0)
  })

  it('mês futuro: nada elapsed ainda, todos os dias restantes', () => {
    const result = computePace({
      monthKeyValue: '2026-10',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 15,
      capCents: 300_000,
      spentCents: 0,
      cardsMineCents: 0,
    })
    expect(result.daysElapsed).toBe(0)
    expect(result.expectedByNowCents).toBe(0)
    expect(result.daysRemaining).toBe(result.daysInMonth)
  })

  it('estourou o teto: remainingCents e perDayRemainingCents ficam negativos', () => {
    const result = computePace({
      monthKeyValue: '2026-09',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 20,
      capCents: 100_000,
      spentCents: 150_000,
      cardsMineCents: 0,
    })
    expect(result.remainingCents).toBe(-50_000)
    expect(result.perDayRemainingCents).toBeLessThan(0)
  })

  it('primeiro dia do mês atual: nada elapsed, esperado zero', () => {
    const result = computePace({
      monthKeyValue: '2026-09',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 1,
      capCents: 300_000,
      spentCents: 0,
      cardsMineCents: 0,
    })
    expect(result.daysElapsed).toBe(0)
    expect(result.expectedByNowCents).toBe(0)
    expect(result.daysRemaining).toBe(result.daysInMonth)
  })

  it('cardsMineCents é repassado como veio', () => {
    const result = computePace({
      monthKeyValue: '2026-09',
      currentMonthKey: '2026-09',
      todayDayOfMonth: 15,
      capCents: 300_000,
      spentCents: 100_000,
      cardsMineCents: 180_000,
    })
    expect(result.cardsMineCents).toBe(180_000)
    expect(result.spentCents).toBe(100_000)
  })
})
