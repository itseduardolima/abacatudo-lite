import { SpendingSection } from './spending-section'

const SPENDING = {
  month: '2026-09',
  totalCents: 10400,
  pixCents: 1000,
  cardPaymentCents: 0,
  otherCents: 400,
  establishments: [
    { key: 'casa la paz', label: 'CASA LA PAZ', count: 1, totalCents: 5000, lastAt: '2026-09-10T15:00:00.000Z' },
    { key: 'uber', label: 'UBER DO BRASIL', count: 3, totalCents: 4000, lastAt: '2026-09-20T15:00:00.000Z' },
  ],
}

describe('SpendingSection', () => {
  it('lista os estabelecimentos com a quantidade, e fecha com outros e Pix; fatura zerada não aparece', () => {
    cy.mount(<SpendingSection spending={SPENDING} />)
    cy.contains('CASA LA PAZ').should('be.visible')
    cy.contains('1 compra').should('be.visible')
    cy.contains('3 compras').should('be.visible')
    cy.contains('Outros estabelecimentos').should('be.visible')
    cy.contains('Pix enviados').should('be.visible')
    cy.contains('Pagamento de fatura').should('not.exist')
  })

  it('sem saída nenhuma, diz isso', () => {
    cy.mount(
      <SpendingSection spending={{ ...SPENDING, totalCents: 0, pixCents: 0, otherCents: 0, establishments: [] }} />,
    )
    cy.contains('Nenhuma saída neste mês.').should('be.visible')
  })
})
