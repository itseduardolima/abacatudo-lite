import { MonthStepper } from './MonthStepper'

describe('MonthStepper', () => {
  it('mostra o mês e chama as duas setas', () => {
    const onPrevious = cy.stub().as('onPrevious')
    const onNext = cy.stub().as('onNext')
    cy.mount(<MonthStepper label="setembro 2026" onPrevious={onPrevious} onNext={onNext} />)
    cy.contains('setembro 2026').should('be.visible')
    cy.get('[aria-label="Mês anterior"]').click()
    cy.get('[aria-label="Próximo mês"]').click()
    cy.get('@onPrevious').should('have.been.calledOnce')
    cy.get('@onNext').should('have.been.calledOnce')
  })

  it('desabilita a seta que não pode andar', () => {
    const onPrevious = cy.stub().as('onPrevious')
    const onNext = cy.stub().as('onNext')
    cy.mount(
      <MonthStepper
        label="setembro 2026"
        onPrevious={onPrevious}
        onNext={onNext}
        canGoPrevious={false}
        canGoNext={false}
      />,
    )
    cy.get('[aria-label="Mês anterior"]').should('be.disabled')
    cy.get('[aria-label="Próximo mês"]').should('be.disabled')
    cy.get('@onPrevious').should('not.have.been.called')
    cy.get('@onNext').should('not.have.been.called')
  })

  it('fullWidth ocupa a largura toda do contêiner', () => {
    cy.mount(
      <div style={{ width: 360 }}>
        <MonthStepper label="setembro 2026" onPrevious={cy.stub()} onNext={cy.stub()} fullWidth />
      </div>,
    )
    cy.contains('setembro 2026').parent().invoke('outerWidth').should('eq', 360)
  })
})
