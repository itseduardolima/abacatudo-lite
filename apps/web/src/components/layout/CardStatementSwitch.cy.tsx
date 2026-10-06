import { CardStatementSwitch } from './CardStatementSwitch'

describe('CardStatementSwitch', () => {
  it('marca só o destino ativo e liga cada opção à sua rota', () => {
    cy.mount(<CardStatementSwitch active="statement" />)
    cy.contains('a', 'Extrato').should('have.attr', 'aria-current', 'page')
    cy.contains('a', 'Extrato').should('have.attr', 'href', '/movements')
    cy.contains('a', 'Cartão').should('have.attr', 'href', '/')
    cy.contains('a', 'Cartão').should('not.have.attr', 'aria-current')
  })
})
