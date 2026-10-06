import { DailyExpenseChart } from './daily-expense-chart'

const DAILY = [
  { day: '2026-09-01', expenseCents: 1500, cumulativeExpenseCents: 1500 },
  { day: '2026-09-02', expenseCents: 0, cumulativeExpenseCents: 1500 },
  { day: '2026-09-03', expenseCents: 700, cumulativeExpenseCents: 2200 },
]

describe('DailyExpenseChart', () => {
  it('sem seleção pede o toque; tocar numa barra mostra o dia, o valor e o acumulado', () => {
    cy.mount(<DailyExpenseChart daily={DAILY} />)
    cy.contains('toque numa barra').should('be.visible')
    cy.get('[aria-label^="Dia 3"]').click()
    cy.contains('dia 3').should('be.visible')
    cy.contains('R$').should('be.visible')
  })

  it('uma barra por dia do mês, com nome acessível', () => {
    cy.mount(<DailyExpenseChart daily={DAILY} />)
    cy.get('[role="listitem"]').should('have.length', 3)
    cy.get('[aria-label^="Dia 1"]').should('exist')
  })
})
