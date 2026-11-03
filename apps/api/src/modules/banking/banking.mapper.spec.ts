import type { PluggyAccount, PluggyTransaction } from './pluggy/pluggy.schemas'
import {
  findRefundedInstallments,
  findSettledPendingTwins,
  mapAccountFields,
  mapTransaction,
  needsReconnect,
  reconnectWarningDays,
  resolveKind,
  type MappedTransaction,
} from './banking.mapper'

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

  it('CREDIT em cartão com descrição "PAGAMENTO ON LINE" (Inter) é pagamento de fatura, não estorno', () => {
    expect(resolveKind(tx({ type: 'CREDIT', description: 'PAGAMENTO ON LINE' }), true)).toBe('CARD_PAYMENT')
    expect(resolveKind(tx({ type: 'CREDIT', description: 'COMPRA PARCELADA INTER' }), true)).toBe('REFUND')
  })

  it('parcela do parcelamento do Inter ("PARC PARCELAMEN INTER") é cobrança, mesmo com categoria de pagamento', () => {
    const plan = (installmentNumber: number | null) =>
      tx({
        type: 'DEBIT',
        description: 'PARC PARCELAMEN INTER',
        operationType: 'OPERACOES_CREDITO_CONTRATADAS_CARTAO',
        category: 'Credit card payment',
        categoryId: '05100000',
        creditCardMetadata: { installmentNumber, totalInstallments: 4 },
      })
    expect(resolveKind(plan(1), true)).toBe('EXPENSE')
    expect(resolveKind(plan(null), true)).toBe('CARD_PAYMENT')
    expect(
      resolveKind(
        tx({
          type: 'DEBIT',
          description: 'PARCELAMENTO FATURA',
          operationType: 'OPERACOES_CREDITO_CONTRATADAS_CARTAO',
          categoryId: '05100000',
          creditCardMetadata: { installmentNumber: 2, totalInstallments: 6 },
        }),
        true,
      ),
    ).toBe('EXPENSE')
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
  it('usa o valor em reais quando a compra é em moeda estrangeira', () => {
    const result = mapTransaction(tx({ amount: 20.75, currencyCode: 'USD', amountInAccountCurrency: 108.88 }), true)
    expect(result.amountCents).toBe(10888)
  })

  it('mantém amount quando a moeda é BRL ou não há valor convertido', () => {
    expect(
      mapTransaction(tx({ amount: 20.75, currencyCode: 'BRL', amountInAccountCurrency: 99 }), true).amountCents,
    ).toBe(2075)
    expect(
      mapTransaction(tx({ amount: 20.75, currencyCode: 'USD', amountInAccountCurrency: null }), true).amountCents,
    ).toBe(2075)
  })

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
      closingOffsetDays: null,
      creditLimitCents: 500000,
    })
  })

  it('Nubank que fecha num mês e vence no seguinte guarda os dias entre o fechamento e o vencimento', () => {
    const result = mapAccountFields(
      account({ creditData: { creditLimit: 5000, balanceCloseDate: '2026-10-27', balanceDueDate: '2026-11-03' } }),
    )
    expect(result.closingOffsetDays).toBe(7)
  })

  it('outro banco, ou Nubank com fechamento e vencimento no mesmo mês, não guarda distância', () => {
    const cross = { creditLimit: 5000, balanceCloseDate: '2026-10-29', balanceDueDate: '2026-11-10' }
    expect(mapAccountFields(account({ name: 'BB', creditData: cross })).closingOffsetDays).toBeNull()
    const same = { creditLimit: 5000, balanceCloseDate: '2026-09-20', balanceDueDate: '2026-09-27' }
    expect(mapAccountFields(account({ creditData: same })).closingOffsetDays).toBeNull()
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

describe('findSettledPendingTwins', () => {
  function mapped(overrides: Partial<MappedTransaction>): MappedTransaction {
    return {
      externalId: 'tx',
      kind: 'CARD_PAYMENT',
      status: 'PENDING',
      amountCents: 54646,
      occurredAt: new Date('2026-09-30T18:33:06.490Z'),
      installmentNumber: null,
      billId: null,
      ...overrides,
    } as MappedTransaction
  }
  const posted = mapped({
    externalId: 'posted',
    status: 'POSTED',
    occurredAt: new Date('2026-09-30T03:00:00.000Z'),
    billId: 'bill-1',
  })

  it('pareia a pendente sem fatura com a lançada do mesmo tipo, valor e dia de Brasília', () => {
    const pending = mapped({ externalId: 'pending' })
    expect(findSettledPendingTwins([pending, posted])).toEqual([{ pendingId: 'pending', postedId: 'posted' }])
  })

  it('pendente de madrugada em UTC ainda é do dia anterior em Brasília', () => {
    const pending = mapped({ externalId: 'pending', occurredAt: new Date('2026-10-01T01:30:00.000Z') })
    expect(findSettledPendingTwins([pending, posted])).toEqual([{ pendingId: 'pending', postedId: 'posted' }])
  })

  it('valor, tipo ou dia diferentes não são a mesma compra', () => {
    expect(findSettledPendingTwins([mapped({ externalId: 'p1', amountCents: 54647 }), posted])).toEqual([])
    expect(findSettledPendingTwins([mapped({ externalId: 'p2', kind: 'EXPENSE' }), posted])).toEqual([])
    expect(
      findSettledPendingTwins([mapped({ externalId: 'p3', occurredAt: new Date('2026-09-29T15:00:00.000Z') }), posted]),
    ).toEqual([])
  })

  it('uma lançada só pareia com uma pendente: duas compras iguais no dia continuam duas', () => {
    const first = mapped({ externalId: 'p1' })
    const second = mapped({ externalId: 'p2' })
    expect(findSettledPendingTwins([first, second, posted])).toEqual([{ pendingId: 'p1', postedId: 'posted' }])
  })

  it('parcela nunca é par de outra: o Pluggy repete a data da compra em cada parcela', () => {
    const parcel = mapped({ externalId: 'parcel', kind: 'EXPENSE', installmentNumber: 3 })
    const parcelPosted = mapped({
      externalId: 'parcel-posted',
      kind: 'EXPENSE',
      status: 'POSTED',
      installmentNumber: 2,
    })
    expect(findSettledPendingTwins([parcel, parcelPosted])).toEqual([])
  })

  it('só pagamento de fatura é pareado: compra pendente igual a uma lançada continua sendo outra compra', () => {
    const expense = mapped({ externalId: 'coffee-2', kind: 'EXPENSE' })
    const expensePosted = mapped({
      externalId: 'coffee-1',
      kind: 'EXPENSE',
      status: 'POSTED',
      occurredAt: new Date('2026-09-30T03:00:00.000Z'),
      billId: 'bill-1',
    })
    expect(findSettledPendingTwins([expense, expensePosted])).toEqual([])
  })

  it('lançada sem fatura ainda não é par da pendente', () => {
    const pending = mapped({ externalId: 'pending' })
    const unbilled = mapped({ ...posted, externalId: 'unbilled', billId: null })
    expect(findSettledPendingTwins([pending, unbilled])).toEqual([])
  })

  it('pendente que já tem fatura não é descartada', () => {
    expect(findSettledPendingTwins([mapped({ externalId: 'billed', billId: 'bill-9' }), posted])).toEqual([])
  })
})

describe('needsReconnect', () => {
  const now = new Date('2026-10-17T12:00:00.000Z')
  const past = new Date('2026-10-01T12:00:00.000Z')
  const future = new Date('2026-11-30T12:00:00.000Z')

  it.each(['WAITING_USER_INPUT', 'LOGIN_ERROR', 'OUTDATED', 'ERROR'] as const)('status %s pede reconexão', (status) => {
    expect(needsReconnect(status, null, now)).toBe(true)
  })

  it('item atualizado e sem data de expiração não pede', () => {
    expect(needsReconnect('UPDATED', null, now)).toBe(false)
  })

  it('consentimento vencido pede reconexão mesmo com status UPDATED', () => {
    expect(needsReconnect('UPDATED', past, now)).toBe(true)
  })

  it('consentimento ainda válido não pede', () => {
    expect(needsReconnect('UPDATED', future, now)).toBe(false)
  })

  it('banco desconectado de propósito nunca pede', () => {
    expect(needsReconnect('DISCONNECTED', past, now)).toBe(false)
  })
})

describe('findRefundedInstallments', () => {
  const purchase = new Date('2026-10-06T15:26:28.001Z')
  function installment(n: number, overrides: Partial<MappedTransaction> = {}): MappedTransaction {
    return {
      externalId: `inst-${n}`,
      kind: 'EXPENSE',
      status: n === 1 ? 'POSTED' : 'PENDING',
      amountCents: n === 1 ? 18241 : 18240,
      occurredAt: purchase,
      description: `Loja X ${n}/4`,
      installmentNumber: n,
      installmentTotal: 4,
      billId: n === 1 ? 'bill-1' : null,
      ...overrides,
    } as MappedTransaction
  }
  function refund(overrides: Partial<MappedTransaction> = {}): MappedTransaction {
    return {
      externalId: 'refund',
      kind: 'REFUND',
      status: 'POSTED',
      amountCents: 18241,
      occurredAt: new Date('2026-10-26T12:00:00.000Z'),
      description: 'Estorno de compra',
      installmentNumber: null,
      installmentTotal: null,
      billId: 'bill-1',
      ...overrides,
    } as MappedTransaction
  }
  const plan = [installment(1), installment(2), installment(3), installment(4)]

  it('estorno do valor da parcela faturada cancela as parcelas pendentes sem fatura', () => {
    expect(findRefundedInstallments([...plan, refund()])).toEqual(['inst-2', 'inst-3', 'inst-4'])
  })

  it('sem estorno, nada é cancelado', () => {
    expect(findRefundedInstallments(plan)).toEqual([])
  })

  it('estorno de outro valor não cancela', () => {
    expect(findRefundedInstallments([...plan, refund({ amountCents: 5000 })])).toEqual([])
  })

  it('estorno anterior à compra não cancela', () => {
    expect(findRefundedInstallments([...plan, refund({ occurredAt: new Date('2026-10-01T12:00:00.000Z') })])).toEqual(
      [],
    )
  })

  it('um estorno cancela só uma compra, mesmo com duas de mesmo valor', () => {
    const other = [1, 2, 3, 4].map((n) =>
      installment(n, { externalId: `other-${n}`, description: `Loja Y ${n}/4`, occurredAt: purchase }),
    )
    expect(findRefundedInstallments([...plan, ...other, refund()])).toEqual(['inst-2', 'inst-3', 'inst-4'])
  })

  it('parcela já faturada nunca é cancelada', () => {
    const billed = installment(2, { status: 'POSTED', billId: 'bill-2' })
    expect(findRefundedInstallments([installment(1), billed, installment(3), refund()])).toEqual(['inst-3'])
  })
})
