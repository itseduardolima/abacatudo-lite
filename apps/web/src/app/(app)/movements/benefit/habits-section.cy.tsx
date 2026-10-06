import { HabitsSection } from './habits-section'

const HABITS = {
  recurring: {
    totalMonthlyCents: 3495,
    totalYearlyCents: 41940,
    items: [
      {
        key: 'disney',
        label: 'THE WALT DISNEY COMPANY',
        monthlyCents: 3495,
        yearlyCents: 41940,
        chargeDay: 13,
        lastChargeAt: '2026-09-13T12:00:00.000Z',
        occurrences: 4,
      },
    ],
  },
  frequent: [
    { key: 'uber', label: 'UBER DO BRASIL', count: 12, totalCents: 25000, lastAt: '2026-09-27T12:00:00.000Z' },
  ],
}

describe('HabitsSection', () => {
  it('mostra os recorrentes com o dia e as cobranças, e os mais frequentes com a quantidade', () => {
    cy.mount(<HabitsSection habits={HABITS} />)
    cy.contains('THE WALT DISNEY COMPANY').should('be.visible')
    cy.contains('todo dia 13 · 4 cobranças').should('be.visible')
    cy.contains('UBER DO BRASIL').should('be.visible')
    cy.contains('12 compras').should('be.visible')
  })

  it('sem nada, diz que não encontrou em cada bloco', () => {
    cy.mount(
      <HabitsSection habits={{ recurring: { totalMonthlyCents: 0, totalYearlyCents: 0, items: [] }, frequent: [] }} />,
    )
    cy.contains('Nenhum gasto recorrente encontrado').should('be.visible')
    cy.contains('Nenhum estabelecimento com 2 ou mais compras').should('be.visible')
  })
})
