import { ReconnectBanner } from './ReconnectBanner'

describe('ReconnectBanner', () => {
  it('não renderiza sem conexão para reconectar', () => {
    cy.mount(
      <ReconnectBanner count={0} institutionName={null} onReconnect={() => {}} isReconnecting={false} error={null} />,
    )
    cy.get('section').should('not.exist')
  })

  it('cita o banco quando é uma conexão e dispara a reconexão', () => {
    const onReconnect = cy.stub().as('onReconnect')
    cy.mount(
      <ReconnectBanner
        count={1}
        institutionName="Nubank"
        onReconnect={onReconnect}
        isReconnecting={false}
        error={null}
      />,
    )
    cy.contains('Sua conexão com Nubank parou de atualizar')
    cy.contains('button', 'Reconectar').click()
    cy.get('@onReconnect').should('have.been.calledOnce')
  })

  it('resume o total quando são várias e mostra o erro da API', () => {
    cy.mount(
      <ReconnectBanner
        count={3}
        institutionName="Nubank"
        onReconnect={() => {}}
        isReconnecting={false}
        error="Falhou."
      />,
    )
    cy.contains('3 conexões com o banco pararam de atualizar')
    cy.get('[role="alert"]').should('contain.text', 'Falhou.')
  })
})
