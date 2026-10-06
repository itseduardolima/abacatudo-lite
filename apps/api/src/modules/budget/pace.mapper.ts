import type { BudgetPace } from '@gastos/shared'

// Último dia do mês (AAAA-MM), sem depender de fuso: dia 0 do mês seguinte em UTC "puro" já é o último
// dia do mês pedido.
function daysInMonthFor(monthKeyValue: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKeyValue)
  if (!match) throw new Error(`monthKey inválido (esperado AAAA-MM): "${monthKeyValue}"`)
  const year = Number(match[1])
  const month = Number(match[2])
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// Ritmo (7.4, 03-regras-negocio § Orçamento mensal): "restante ÷ dias restantes" = quanto dá pra gastar
// por dia até o fim do mês; sinaliza quando o gasto acumulado já passou do esperado linear até hoje.
// Função pura (sem I/O) pra ser testada sem mockar nada — o service só busca capCents/spentCents e chama
// isto.
export function computePace(input: {
  monthKeyValue: string
  currentMonthKey: string
  todayDayOfMonth: number
  capCents: number
  spentCents: number
  cardsMineCents: number
}): Omit<BudgetPace, 'firstHalfSpentCents' | 'currentHalf' | 'currentHalfRemainingCents' | 'firstHalfCapCents'> {
  const daysInMonth = daysInMonthFor(input.monthKeyValue)

  let daysElapsed: number
  if (input.monthKeyValue < input.currentMonthKey) {
    daysElapsed = daysInMonth
  } else if (input.monthKeyValue > input.currentMonthKey) {
    daysElapsed = 0
  } else {
    // Hoje ainda não "fechou": só os dias já completos entram no esperado até agora.
    daysElapsed = input.todayDayOfMonth - 1
  }
  const daysRemaining = daysInMonth - daysElapsed

  const expectedByNowCents = Math.round((input.capCents * daysElapsed) / daysInMonth)
  const remainingCents = input.capCents - input.spentCents
  const diffCents = expectedByNowCents - input.spentCents
  const status: BudgetPace['status'] = diffCents >= 0 ? 'ON_TRACK' : 'OVER_PACE'
  const perDayRemainingCents = daysRemaining > 0 ? Math.round(remainingCents / daysRemaining) : 0

  return {
    month: input.monthKeyValue,
    capCents: input.capCents,
    spentCents: input.spentCents,
    cardsMineCents: input.cardsMineCents,
    remainingCents,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    expectedByNowCents,
    diffCents,
    status,
    perDayRemainingCents,
  }
}
