import { Input } from './Input'

describe('Input', () => {
  it('associa o label ao campo pelo id/name', () => {
    cy.mount(<Input label="E-mail" name="email" />)
    cy.contains('label', 'E-mail')
      .invoke('attr', 'for')
      .then((forAttr) => {
        cy.get(`#${forAttr}`).should('have.attr', 'name', 'email')
      })
  })

  it('sem erro, não mostra mensagem nem marca aria-invalid', () => {
    cy.mount(<Input label="E-mail" name="email" />)
    cy.get('input').should('not.have.attr', 'aria-invalid')
    cy.get('[role="alert"]').should('not.exist')
  })

  it('com erro, mostra a mensagem exata abaixo do campo e marca aria-invalid', () => {
    cy.mount(<Input label="E-mail" name="email" error="Informe um e-mail válido." />)
    cy.get('input').should('have.attr', 'aria-invalid', 'true')
    cy.contains('Informe um e-mail válido.').should('be.visible')
  })

  it('digita normalmente (controlado por quem usa, sem bloquear no cliente)', () => {
    cy.mount(<Input label="Senha" name="password" type="password" />)
    cy.get('input').type('segredo123').should('have.value', 'segredo123')
  })
})
