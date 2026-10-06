import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'ALL', label: 'Tudo' },
  { value: 'IN', label: 'Entradas' },
] as const

describe('SegmentedControl', () => {
  it('marca a opção ativa e avisa a escolha', () => {
    const onChange = cy.stub().as('onChange')
    cy.mount(<SegmentedControl label="Tipo" options={[...OPTIONS]} value="ALL" onChange={onChange} />)
    cy.contains('[role="radio"]', 'Tudo').should('have.attr', 'aria-checked', 'true')
    cy.contains('[role="radio"]', 'Entradas').should('have.attr', 'aria-checked', 'false')
    cy.contains('[role="radio"]', 'Entradas').click()
    cy.get('@onChange').should('have.been.calledWith', 'IN')
  })
})
