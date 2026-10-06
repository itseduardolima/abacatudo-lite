import { budgetMonthSchema, updateBudgetMonthInputSchema } from './budget'

describe('budgetMonthSchema', () => {
  it('aceita a forma completa', () => {
    const result = budgetMonthSchema.safeParse({
      month: '2026-09',
      incomeCents: 500000,
      benefitCents: 60000,
      fixedExpensesCents: 200000,
      savingsGoalCents: 50000,
      variableCapCents: 310000,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita mês em formato errado', () => {
    expect(
      budgetMonthSchema.safeParse({
        month: '09-2026',
        incomeCents: 0,
        benefitCents: 0,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
        variableCapCents: 0,
      }).success,
    ).toBe(false)
  })
})

describe('updateBudgetMonthInputSchema', () => {
  it('rejeita valor negativo', () => {
    expect(
      updateBudgetMonthInputSchema.safeParse({
        incomeCents: -100,
        benefitCents: 0,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
      }).success,
    ).toBe(false)
  })

  it('rejeita campo extra', () => {
    expect(
      updateBudgetMonthInputSchema.safeParse({
        incomeCents: 0,
        benefitCents: 0,
        fixedExpensesCents: 0,
        savingsGoalCents: 0,
        month: '2026-09',
      }).success,
    ).toBe(false)
  })
})
