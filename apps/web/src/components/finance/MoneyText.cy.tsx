import { MoneyText } from './MoneyText'

// Texto visível do span, com o espaço não separável normalizado para comparar.
function shows(cents: number, expected: string) {
  cy.mount(<MoneyText cents={cents} />)
  cy.get('span')
    .first()
    .invoke('text')
    .then((text) => expect(text.replace(/\u00a0/g, ' ')).to.equal(expected))
}

describe('MoneyText', () => {
  it('formata centavos em reais com milhar e vírgula', () => {
    shows(184237, 'R$ 1.842,37')
  })

  it('formata zero, centavos soltos e valores grandes', () => {
    shows(0, 'R$ 0,00')
    shows(5, 'R$ 0,05')
    shows(100000000, 'R$ 1.000.000,00')
  })

  it('usa o sinal de menos real (não hífen) em valor negativo', () => {
    shows(-5000, '\u2212R$ 50,00')
  })

  it('nunca quebra entre "R$" e o número (espaço não separável)', () => {
    cy.mount(<MoneyText cents={123456} />)
    cy.get('span').first().invoke('text').should('contain', '\u00a0')
  })

  it('usa tabular-nums para as colunas de valores alinharem', () => {
    cy.mount(<MoneyText cents={100} />)
    cy.get('span').first().should('have.css', 'font-variant-numeric', 'tabular-nums')
  })
})
