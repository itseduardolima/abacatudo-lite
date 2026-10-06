import type { BudgetMonth as BudgetMonthRow } from '@prisma/client'
import type { BudgetMonth } from '@gastos/shared'

// teto variável = renda − gastos fixos − meta de poupança (03-regras-negocio § Orçamento
// mensal). Pode dar negativo (o User se comprometeu além da renda) — mostrar isso é o ponto, não esconder.
export function computeVariableCapCents(values: {
  incomeCents: number
  fixedExpensesCents: number
  savingsGoalCents: number
}): number {
  return values.incomeCents - values.fixedExpensesCents - values.savingsGoalCents
}

export function toBudgetMonthDto(row: BudgetMonthRow): BudgetMonth {
  return {
    month: row.month,
    incomeCents: row.incomeCents,
    fixedExpensesCents: row.fixedExpensesCents,
    savingsGoalCents: row.savingsGoalCents,
    variableCapCents: computeVariableCapCents(row),
  }
}
