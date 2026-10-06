import { Button } from './Button'

describe('Button', () => {
  it('chama onClick ao clicar', () => {
    const onClick = cy.stub().as('onClick')
    cy.mount(<Button onClick={onClick}>Entrar</Button>)
    cy.contains('button', 'Entrar').click()
    cy.get('@onClick').should('have.been.calledOnce')
  })

  it('em loading fica desabilitado e não dispara onClick (espera a resposta da API)', () => {
    const onClick = cy.stub().as('onClick')
    cy.mount(
      <Button state="loading" onClick={onClick}>
        Salvar
      </Button>,
    )
    cy.contains('button', 'Salvar').should('be.disabled').and('have.attr', 'aria-busy', 'true')
    cy.contains('button', 'Salvar').click({ force: true })
    cy.get('@onClick').should('not.have.been.called')
  })

  it('respeita disabled', () => {
    cy.mount(<Button disabled>Enviar</Button>)
    cy.contains('button', 'Enviar').should('be.disabled')
  })

  it('tem alvo de toque de pelo menos 44px de altura', () => {
    cy.mount(<Button>Confirmar</Button>)
    cy.contains('button', 'Confirmar').invoke('outerHeight').should('be.gte', 44)
  })

  it('o link não é um botão preenchido (não usa o fundo lima)', () => {
    cy.mount(<Button variant="link">Cancelar</Button>)
    cy.contains('button', 'Cancelar').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)')
  })
})
