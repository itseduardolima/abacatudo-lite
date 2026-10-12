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
      sourceTransactionId: '3f9c6f2e-0a53-4f7a-9a52-6d3f6f0d4a11',
      personId: null,
      splits: [],
      personName: null,
      personIsSelf: false,
      personOthersIndex: -1,
      splitPeople: [],
    },
    {
      key: 'b#2',
      label: 'TV',
      amountCents: 10000,
      installmentNumber: 2,
      installmentTotal: 10,
      dueAt: '2026-10-20T12:00:00.000Z',
      sourceTransactionId: '4a0d7a3f-1b64-4a08-8b63-7e4a1e1e5b22',
      personId: '5b1e8c3a-2d47-4f10-9a8e-0c6d7f3b9a11',
      splits: [],
      personName: 'Ana',
      personIsSelf: false,
      personOthersIndex: 0,
      splitPeople: [],
    },
  ],
}

describe('EstimatedInstallmentsSection', () => {
  it('lista cada parcela estimada com número, data e o selo "estimada"', () => {
    cy.mount(<EstimatedInstallmentsSection data={DATA} onSelect={cy.stub().as('onSelect')} />)
    cy.contains('Parcelas estimadas').should('be.visible')
    cy.contains('Air fryer').should('be.visible')
    cy.contains('3/12').should('be.visible')
    cy.get('span').filter(':contains("estimada")').should('have.length.at.least', 2)
  })

  it('mostra o avatar de quem é a compra, "Sem dono" quando não tem pessoa', () => {
    cy.mount(<EstimatedInstallmentsSection data={DATA} onSelect={cy.stub()} />)
    cy.contains('button', 'TV').contains('A').should('be.visible')
    cy.contains('button', 'Air fryer').contains('Sem dono').should('be.visible')
  })

  it('dividida mostra os avatares de quem entra, não um selo de texto', () => {
    const split = {
      ...DATA,
      items: [
        {
          ...DATA.items[0]!,
          splitPeople: [
            { id: 'p1', name: 'Eduardo', isSelf: true, othersIndex: -1 },
            { id: 'p2', name: 'Mãe', isSelf: false, othersIndex: 0 },
          ],
        },
      ],
    }
    cy.mount(<EstimatedInstallmentsSection data={split} onSelect={cy.stub()} />)
    cy.get('[aria-label="Dividido entre Eduardo, Mãe"]').should('be.visible').children().should('have.length', 2)
    cy.contains('Dividido').should('not.exist')
  })

  it('tocar numa parcela estimada avisa qual foi, pra atribuir a pessoa', () => {
    cy.mount(<EstimatedInstallmentsSection data={DATA} onSelect={cy.stub().as('onSelect')} />)
    cy.contains('button', 'TV').click()
    cy.get('@onSelect').should('have.been.calledWith', 'b#2')
  })

  it('sem parcelas estimadas não mostra nada', () => {
    cy.mount(
      <EstimatedInstallmentsSection data={{ month: '2026-10', totalCents: 0, items: [] }} onSelect={cy.stub()} />,
    )
    cy.contains('Parcelas estimadas').should('not.exist')
  })
})
