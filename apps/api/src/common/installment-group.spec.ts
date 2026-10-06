import { installmentBaseName, installmentGroupKey, keepCurrentInstallmentsOnly } from './installment-group'

interface TestRow {
  id: string
  billId: string | null
  description: string
  occurredAt: Date
  installmentNumber: number | null
  installmentTotal: number | null
}

const OCCURRED_AT = new Date('2026-09-04T12:00:00.000Z')

function row(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 'tx-1',
    billId: null,
    description: 'Ebn*Playstati',
    occurredAt: OCCURRED_AT,
    installmentNumber: null,
    installmentTotal: null,
    ...overrides,
  }
}

describe('installmentGroupKey', () => {
  it('tira o "N/M" do fim da descrição pra agrupar', () => {
    const a = installmentGroupKey({ description: 'Compra 1/3', occurredAt: OCCURRED_AT, installmentTotal: 3 })
    const b = installmentGroupKey({ description: 'Compra 2/3', occurredAt: OCCURRED_AT, installmentTotal: 3 })
    expect(a).toBe(b)
  })

  it('compras diferentes no mesmo dia com o mesmo nome não se misturam se o total de parcelas for diferente', () => {
    const a = installmentGroupKey({ description: 'Compra 1/3', occurredAt: OCCURRED_AT, installmentTotal: 3 })
    const b = installmentGroupKey({ description: 'Compra 1/6', occurredAt: OCCURRED_AT, installmentTotal: 6 })
    expect(a).not.toBe(b)
  })
})

describe('installmentGroupKey — descrição do BB e data de compra variável', () => {
  const key = (description: string, number: number, at: string, total = 12) =>
    installmentGroupKey({ description, occurredAt: new Date(at), installmentTotal: total, installmentNumber: number })

  it('junta as parcelas do BB: marcador "PARC 05/12" no meio, cidade depois, espaços de sobra', () => {
    const a = key('RAMSONS STUDI PARC 05/12 MANAUS      BR', 5, '2026-02-18T00:19:51.000Z')
    const b = key('RAMSONS STUDI PARC 06/12 MANAUS      BR', 6, '2026-02-18T00:19:51.000Z')
    const c = key('RAMSONS STUDI PARC 10/12 MANAUS BR', 10, '2026-02-18T00:19:51.000Z')

    expect(a).toBe(b)
    expect(a).toBe(c)
  })

  it('a data da compra varia entre parcelas (17 e 18/02): continua a mesma compra', () => {
    const a = key('RAMSONS STUDI PARC 05/12 MANAUS      BR', 5, '2026-02-18T00:19:51.000Z')
    const b = key('RAMSONS STUDI PARC 06/12 MANAUS      BR', 6, '2026-02-17T00:00:00.000Z')

    expect(a).toBe(b)
  })

  it('o formato do Nubank (marcador no fim) continua funcionando', () => {
    const a = key('Ramsons Manauara 1/4', 1, '2025-12-26T17:55:44.000Z', 4)
    const b = key('Ramsons Manauara 4/4', 4, '2025-12-26T17:55:44.000Z', 4)

    expect(a).toBe(b)
  })

  it('compras do mesmo nome em meses diferentes, ou com total diferente, não se misturam', () => {
    const feb = key('MANAUS ADRI M PARC 01/10 MANAUS BR', 1, '2026-08-13T12:00:00.000Z', 10)
    const sep = key('MANAUS ADRI M PARC 01/10 MANAUS BR', 1, '2026-09-15T12:00:00.000Z', 10)
    const other = key('MANAUS ADRI M PARC 01/06 MANAUS BR', 1, '2026-08-13T12:00:00.000Z', 6)

    expect(feb).not.toBe(sep)
    expect(feb).not.toBe(other)
  })

  it('só tira o marcador da própria parcela, nunca um "N/M" parecido no nome da loja', () => {
    const a = key('LOJA 15/12 PARC 05/12 MANAUS BR', 5, '2026-02-18T00:19:51.000Z')
    const b = key('LOJA 15/12 PARC 06/12 MANAUS BR', 6, '2026-02-18T00:19:51.000Z')

    expect(a).toBe(b)
    expect(a).toContain('loja 15/12')
  })
})

describe('keepCurrentInstallmentsOnly', () => {
  it('compra parcelada sem billId: mantém só a parcela de menor número, descarta as futuras', () => {
    const rows = [
      row({ id: 'p2', description: 'Ebn*Playstati 2/3', installmentNumber: 2, installmentTotal: 3 }),
      row({ id: 'p3', description: 'Ebn*Playstati 3/3', installmentNumber: 3, installmentTotal: 3 }),
      row({ id: 'p1', description: 'Ebn*Playstati 1/3', installmentNumber: 1, installmentTotal: 3 }),
    ]

    const result = keepCurrentInstallmentsOnly(rows)

    expect(result.map((r) => r.id)).toEqual(['p1'])
  })

  it('linha já faturada (billId preenchido) sempre passa, mesmo sendo parcela', () => {
    const rows = [
      row({ id: 'billed-2', billId: 'bill-1', installmentNumber: 2, installmentTotal: 3 }),
      row({ id: 'open-1', installmentNumber: 1, installmentTotal: 3 }),
    ]

    const result = keepCurrentInstallmentsOnly(rows)

    expect(result.map((r) => r.id).sort()).toEqual(['billed-2', 'open-1'])
  })

  it('linha sem parcela (compra normal, pagamento) sempre passa direto', () => {
    const rows = [row({ id: 'normal' }), row({ id: 'payment', description: 'Pagamento recebido' })]

    expect(keepCurrentInstallmentsOnly(rows).map((r) => r.id)).toEqual(['normal', 'payment'])
  })

  it('grupos diferentes não se misturam', () => {
    const rows = [
      row({ id: 'a1', description: 'Compra A 1/2', installmentNumber: 1, installmentTotal: 2 }),
      row({ id: 'b1', description: 'Compra B 1/4', installmentNumber: 1, installmentTotal: 4 }),
    ]

    expect(
      keepCurrentInstallmentsOnly(rows)
        .map((r) => r.id)
        .sort(),
    ).toEqual(['a1', 'b1'])
  })

  it('sem linhas, sem linhas', () => {
    expect(keepCurrentInstallmentsOnly([])).toEqual([])
  })
})

describe('installmentBaseName', () => {
  it('tira o marcador da parcela em qualquer posição, sem mexer no resto do nome', () => {
    expect(
      installmentBaseName({
        description: 'RAMSONS STUDI PARC 05/12 MANAUS      BR',
        installmentNumber: 5,
        installmentTotal: 12,
      }),
    ).toBe('RAMSONS STUDI MANAUS BR')
    expect(
      installmentBaseName({ description: 'Ramsons Manauara 3/4', installmentNumber: 3, installmentTotal: 4 }),
    ).toBe('Ramsons Manauara')
    expect(
      installmentBaseName({
        description: 'LOJA 15/12 PARC 05/12 MANAUS BR',
        installmentNumber: 5,
        installmentTotal: 12,
      }),
    ).toBe('LOJA 15/12 MANAUS BR')
  })

  it('sem o número da parcela, só tira o marcador do fim (comportamento antigo)', () => {
    expect(installmentBaseName({ description: 'Compra 2/6', installmentTotal: 6 })).toBe('Compra')
  })
})
