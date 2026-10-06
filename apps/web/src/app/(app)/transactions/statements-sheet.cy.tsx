import { StatementsSheet } from './statements-sheet'

const STATEMENT = {
  personId: '3f9c6f2e-0a53-4f7a-9a52-6d3f6f0d4a11',
  personName: 'Ana',
  totalCents: 25704,
  text: 'Sua conta de setembro\n\nFogão: R$ 45,00\nPagar até dia 10\n\nTotal: R$ 257,04',
}

function mountSheet(overrides: Partial<Parameters<typeof StatementsSheet>[0]> = {}) {
  const onSend = cy.stub().as('onSend')
  const onCopy = cy.stub().as('onCopy')
  cy.mount(
    <StatementsSheet
      statements={[STATEMENT]}
      isLoading={false}
      isError={false}
      isForecast={false}
      copiedPersonId={null}
      isTooLongForLink={() => false}
      onSend={onSend}
      onCopy={onCopy}
      onClose={cy.stub()}
      {...overrides}
    />,
  )
}

describe('StatementsSheet', () => {
  it('mostra a pessoa, o texto pronto e dispara WhatsApp e Copiar com o texto dela', () => {
    mountSheet()
    cy.contains('Ana').should('be.visible')
    cy.contains('Pagar até dia 10').should('be.visible')
    cy.contains('button', 'WhatsApp').click()
    cy.get('@onSend').should('have.been.calledOnceWith', STATEMENT.text)
    cy.contains('button', 'Copiar texto').click()
    cy.get('@onCopy').should('have.been.calledOnceWith', STATEMENT.personId, STATEMENT.text)
  })

  it('texto grande demais para o link: WhatsApp desabilitado e aviso para copiar', () => {
    mountSheet({ isTooLongForLink: () => true })
    cy.contains('button', 'WhatsApp').should('be.disabled')
    cy.contains('use Copiar').should('be.visible')
  })

  it('avisa que é previsão e mostra "Copiado" depois de copiar', () => {
    mountSheet({ isForecast: true, copiedPersonId: STATEMENT.personId })
    cy.contains('Previsão').should('be.visible')
    cy.contains('button', 'Copiado').should('be.visible')
  })

  it('sem compras no mês, diz que ninguém tem compras', () => {
    mountSheet({ statements: [] })
    cy.contains('Ninguém tem compras neste mês.').should('be.visible')
  })
})
