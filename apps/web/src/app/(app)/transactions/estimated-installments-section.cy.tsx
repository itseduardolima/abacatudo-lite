import { EstimatedInstallmentsSection } from './estimated-installments-section'

const DATA = {
  month: '2026-10',
  totalCents: 31204,
  items: [
    {
      key: 'a#3',
      label: 'Air fryer',
      amountCents: 21204,
      installmentNumber: 3,
      installmentTotal: 12,
      dueAt: '2026-10-17T12:00:00.000Z',
    },
    {
      key: 'b#2',
      label: 'TV',
      amountCents: 10000,
      installmentNumber: 2,
      installmentTotal: 10,
      dueAt: '2026-10-20T12:00:00.000Z',
    },
  ],
}

describe('EstimatedInstallmentsSection', () => {
  it('lista cada parcela estimada com número, data e o selo "estimada"', () => {
    cy.mount(<EstimatedInstallmentsSection data={DATA} />)
    cy.contains('Parcelas estimadas').should('be.visible')
    cy.contains('Air fryer').should('be.visible')
    cy.contains('3/12').should('be.visible')
    cy.get('span').filter(':contains("estimada")').should('have.length.at.least', 2)
  })

  it('sem parcelas estimadas não mostra nada', () => {
    cy.mount(<EstimatedInstallmentsSection data={{ month: '2026-10', totalCents: 0, items: [] }} />)
    cy.contains('Parcelas estimadas').should('not.exist')
  })
})
