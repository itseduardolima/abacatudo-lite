import { PixRecipientsSection } from './pix-recipients-section'

const DATA = {
  month: '2026-09',
  totalCents: 4200,
  recipients: [
    { key: 'ana souza', name: 'Ana Souza', totalCents: 3500, count: 2, lastAt: '2026-09-21T12:00:00.000Z' },
    { key: 'bruno lima', name: 'Bruno Lima', totalCents: 700, count: 1, lastAt: '2026-09-10T12:00:00.000Z' },
  ],
}

describe('PixRecipientsSection', () => {
  it('lista cada favorecido com a quantidade e abre o detalhe ao tocar', () => {
    const onOpen = cy.stub().as('onOpen')
    cy.mount(<PixRecipientsSection data={DATA} search="" onSearchChange={cy.stub()} onOpenRecipient={onOpen} />)
    cy.contains('Ana Souza').should('be.visible')
    cy.contains('2 Pix').should('be.visible')
    cy.contains('Bruno Lima').click()
    cy.get('@onOpen').should('have.been.calledOnceWith', 'bruno lima', 'Bruno Lima')
  })

  it('sem resultado mostra a mensagem certa para busca e para mês vazio', () => {
    cy.mount(
      <PixRecipientsSection
        data={{ month: '2026-09', totalCents: 0, recipients: [] }}
        search="zzz"
        onSearchChange={cy.stub()}
        onOpenRecipient={cy.stub()}
      />,
    )
    cy.contains('Nenhum favorecido com esse nome.').should('be.visible')
    cy.mount(
      <PixRecipientsSection
        data={{ month: '2026-09', totalCents: 0, recipients: [] }}
        search=""
        onSearchChange={cy.stub()}
        onOpenRecipient={cy.stub()}
      />,
    )
    cy.contains('Nenhum Pix enviado neste mês.').should('be.visible')
  })
})
