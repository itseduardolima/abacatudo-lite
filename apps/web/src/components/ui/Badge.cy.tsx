import { Badge } from './Badge'

describe('Badge', () => {
  it('mostra o texto em formato de pílula', () => {
    cy.mount(<Badge>Cartão de crédito</Badge>)
    cy.contains('span', 'Cartão de crédito').should('have.class', 'rounded-pill')
  })
})
