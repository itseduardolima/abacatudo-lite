import type { PluggyAccount, PluggyTransaction } from './pluggy/pluggy.schemas'
import { mapAccountFields, mapTransaction, reconnectWarningDays, resolveKind } from './banking.mapper'

function tx(overrides: Partial<PluggyTransaction> = {}): PluggyTransaction {
  return {
    id: 'tx-1',
    amount: 150.5,
    type: 'DEBIT',
    operationType: null,
    category: null,
    categoryId: null,
    status: 'POSTED',
    date: '2026-09-21',
    description: 'PAG*LOJA',
    merchant: null,
    creditCardMetadata: null,
    ...overrides,
  }
}

describe('resolveKind', () => {
  it('compra normal (DEBIT) é EXPENSE, em cartão ou movimentação', () => {
    expect(resolveKind(tx({ type: 'DEBIT' }), true)).toBe('EXPENSE')
    expect(resolveKind(tx({ type: 'DEBIT' }), false)).toBe('EXPENSE')
  })

  it('CREDIT em cartão sem categoria de pagamento é estorno (REFUND)', () => {
    expect(resolveKind(tx({ type: 'CREDIT' }), true)).toBe('REFUND')
  })

  it('CREDIT em movimentação é dinheiro entrando de verdade (INCOME), não estorno', () => {
    expect(resolveKind(tx({ type: 'CREDIT' }), false)).toBe('INCOME')
  })

  it('operationType "PAGAMENTO" sozinho não basta (o Pluggy usa o mesmo valor pra compra parcelada)', () => {
    expect(resolveKind(tx({ type: 'DEBIT', operationType: 'PAGAMENTO' }), true)).toBe('EXPENSE')
  })

  it('categoryId de pagamento de fatura é CARD_PAYMENT, nunca gasto', () => {
    expect(resolveKind(tx({ type: 'CREDIT', categoryId: '05100000' }), true)).toBe('CARD_PAYMENT')
  })

  it('category "Credit card payment" também é CARD_PAYMENT (fallback sem categoryId)', () => {
    expect(resolveKind(tx({ type: 'CREDIT', category: 'Credit card payment' }), true)).toBe('CARD_PAYMENT')
  })

  it('Banco do Brasil não manda categoryId de pagamento — operationType "PAGAMENTO_FATURA" também é CARD_PAYMENT (visto na prática, categorias variam por canal: Cash, Internal, PIX)', () => {
    expect(resolveKind(tx({ type: 'CREDIT', categoryId: '05020000', operationType: 'PAGAMENTO_FATURA' }), true)).toBe(
      'CARD_PAYMENT',
    )
    expect(resolveKind(tx({ type: 'CREDIT', categoryId: '05060000', operationType: 'PAGAMENTO_FATURA' }), true)).toBe(
      'CARD_PAYMENT',
    )
  })

  it('operationType "PAGAMENTO" genérico (sem "_FATURA") não basta — é o mesmo valor de uma parcela comum', () => {
    expect(resolveKind(tx({ type: 'CREDIT', operationType: 'PAGAMENTO' }), true)).toBe('REFUND')
  })

  it('"PAGAMENTO_FATURA" só conta em cartão — em movimentação CREDIT já é INCOME de qualquer jeito', () => {
    expect(resolveKind(tx({ type: 'CREDIT', operationType: 'PAGAMENTO_FATURA' }), false)).toBe('INCOME')
  })
})

describe('mapTransaction', () => {
  it('converte valor para centavos absolutos e mapeia metadados de parcela', () => {
    const result = mapTransaction(
      tx({
        amount: -89.9,
        merchant: { businessName: 'Loja X' },
        creditCardMetadata: { cardNumber: '1234', totalInstallments: 3, installmentNumber: 1, billId: 'bill-1' },
      }),
      true,
    )
    expect(result.amountCents).toBe(8990)
    expect(result.merchant).toBe('Loja X')
    expect(result.cardLast4).toBe('1234')
    expect(result.installmentTotal).toBe(3)
    expect(result.billId).toBe('bill-1')
  })

  it('sem metadados de cartão, os campos ficam null', () => {
    const result = mapTransaction(tx(), true)
    expect(result.cardLast4).toBeNull()
    expect(result.installmentNumber).toBeNull()
  })

  it('parcela usa purchaseDate (data real da compra), não a data da parcela na fatura', () => {
    const result = mapTransaction(
      tx({
        date: '2027-05-21',
        creditCardMetadata: {
          cardNumber: '9391',
          totalInstallments: 12,
          installmentNumber: 12,
          billId: null,
          purchaseDate: '2026-06-21T22:35:59.001Z',
        },
      }),
      true,
    )
    expect(new Date(result.occurredAt).toISOString()).toBe('2026-06-21T22:35:59.001Z')
  })

  it('sem purchaseDate, cai pra `date`', () => {
    const result = mapTransaction(tx({ date: '2026-09-21' }), true)
    expect(new Date(result.occurredAt).toISOString()).toBe('2026-09-21T12:00:00.000Z')
  })

  it('em conta de movimentação, CREDIT vira INCOME', () => {
    const result = mapTransaction(tx({ type: 'CREDIT' }), false)
    expect(result.kind).toBe('INCOME')
  })
})

describe('mapAccountFields', () => {
  function account(overrides: Partial<PluggyAccount> = {}): PluggyAccount {
    return { id: 'acc-1', type: 'CREDIT', name: 'Nubank', creditData: null, ...overrides }
  }

  it('conta CREDIT vira CREDIT_CARD, com dia de fechamento/vencimento e limite em centavos', () => {
    const result = mapAccountFields(
      account({ creditData: { creditLimit: 5000, balanceCloseDate: '2026-09-20', balanceDueDate: '2026-09-27' } }),
    )
    expect(result).toEqual({
      type: 'CREDIT_CARD',
      closingDay: 20,
      dueDay: 27,
      creditLimitCents: 500000,
      balanceCents: null,
    })
  })

  it('conta CREDIT nunca leva saldo, mesmo que o Pluggy mande um (a fatura é calculada à parte)', () => {
    const result = mapAccountFields(account({ balance: 1234.5 }))
    expect(result.balanceCents).toBeNull()
  })

  it('conta BANK vira CHECKING, sem campos de cartão, saldo em centavos', () => {
    const result = mapAccountFields(account({ type: 'BANK', creditData: null, balance: 589.9 }))
    expect(result).toEqual({
      type: 'CHECKING',
      closingDay: null,
      dueDay: null,
      creditLimitCents: null,
      balanceCents: 58990,
    })
  })

  it('conta BANK sem balance (Pluggy não mandou), saldo fica null', () => {
    const result = mapAccountFields(account({ type: 'BANK', creditData: null }))
    expect(result.balanceCents).toBeNull()
  })
})

describe('reconnectWarningDays', () => {
  const now = new Date('2026-09-23T12:00:00.000Z')

  it('sem consentExpiresAt (a maioria dos bancos), nunca avisa', () => {
    expect(reconnectWarningDays(null, now)).toBeNull()
  })

  it('mais de 30 dias, nunca avisa', () => {
    expect(reconnectWarningDays(new Date('2026-10-25T12:00:00.000Z'), now)).toBeNull()
  })

  it('entre 8 e 30 dias, avisa no limiar de 30', () => {
    expect(reconnectWarningDays(new Date('2026-10-23T12:00:00.000Z'), now)).toBe(30) // 30 dias
    expect(reconnectWarningDays(new Date('2026-10-01T12:00:00.000Z'), now)).toBe(30) // 8 dias
  })

  it('7 dias ou menos, avisa no limiar mais urgente', () => {
    expect(reconnectWarningDays(new Date('2026-09-30T12:00:00.000Z'), now)).toBe(7) // 7 dias
    expect(reconnectWarningDays(new Date('2026-09-24T12:00:00.000Z'), now)).toBe(7) // 1 dia
  })

  it('já vencido continua no limiar mais urgente, nunca vira null — sem sync não sabemos que venceu de verdade', () => {
    expect(reconnectWarningDays(new Date('2026-09-20T12:00:00.000Z'), now)).toBe(7)
  })
})
