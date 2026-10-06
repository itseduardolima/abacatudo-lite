import { InlineAlert } from './InlineAlert'

describe('InlineAlert', () => {
  it('mostra a mensagem com role="alert"', () => {
    cy.mount(<InlineAlert>E-mail ou senha incorretos.</InlineAlert>)
    cy.get('[role="alert"]').should('contain.text', 'E-mail ou senha incorretos.')
  })
})
