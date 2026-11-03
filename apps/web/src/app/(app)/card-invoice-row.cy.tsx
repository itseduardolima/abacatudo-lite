import type { Account, AccountInvoice } from '@gastos/shared'
import { CardInvoiceRow } from './card-invoice-row'

const account = {
  id: 'acc-1',
  name: 'Pic Pay',
  dueDay: 10,
  bankLogo: null,
} as unknown as Account

const invoice: AccountInvoice = {
  totalCents: 108428,
  mineCents: 108428,
  notMineCents: 0,
  isForecast: false,
  estimatedCents: 0,
  advancePaidCents: 0,
  previousBillRemainingCents: 0,
  payableCents: 108428,
  staleSince: null,
  firstMonth: '2026-09',
  lastForecastMonth: null,
}

describe('CardInvoiceRow', () => {
  it('sem defasagem não mostra aviso', () => {
    cy.mount(<CardInvoiceRow account={account} invoice={invoice} />)
    cy.contains('Últimas compras recebidas').should('not.exist')
  })

  it('com staleSince avisa a data da última compra recebida', () => {
    cy.mount(<CardInvoiceRow account={account} invoice={{ ...invoice, staleSince: '2026-10-25T20:25:28.001Z' }} />)
    cy.contains('Últimas compras recebidas do banco: 25/10').should('be.visible')
  })

  it('mês passado leva à fatura daquele mês', () => {
    cy.mount(<CardInvoiceRow account={account} invoice={invoice} month="2026-10" />)
    cy.get('a').should('have.attr', 'href', '/transactions?month=2026-10')
  })

  it('mês atual é link pra fatura', () => {
    cy.mount(<CardInvoiceRow account={account} invoice={invoice} />)
    cy.get('a').should('have.attr', 'href', '/transactions')
  })
})
