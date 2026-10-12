import { inheritInstallmentAssignments, type InstallmentRowWithSplits } from './installment-inheritance'

function row(overrides: Partial<InstallmentRowWithSplits> = {}): InstallmentRowWithSplits {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    description: 'MANAUS ADRI M PARC 01/10 MANAUS      BR',
    occurredAt: new Date('2026-08-13T15:00:00.000Z'),
    amountCents: 10744,
    installmentNumber: 1,
    installmentTotal: 10,
    personId: 'self',
    splits: [],
    ...overrides,
  }
}

const next = (overrides: Partial<InstallmentRowWithSplits> = {}) =>
  row({
    id: 'tx-2',
    description: 'MANAUS ADRI M PARC 02/10 MANAUS      BR',
    installmentNumber: 2,
    ...overrides,
  })

describe('inheritInstallmentAssignments', () => {
  it('parcela nova herda a pessoa da parcela anterior da mesma compra', () => {
    const result = inheritInstallmentAssignments([row({ personId: 'ana' }), next()], new Set(['tx-2']))

    expect(result).toEqual([{ transactionId: 'tx-2', personId: 'ana', splits: [] }])
  })

  it('parcela nova herda a divisão, escalada ao valor dela, e a soma fecha', () => {
    const result = inheritInstallmentAssignments(
      [
        row({
          personId: null,
          splits: [
            { personId: 'self', amountCents: 5372 },
            { personId: 'ana', amountCents: 5372 },
          ],
        }),
        next({ amountCents: 10745 }),
      ],
      new Set(['tx-2']),
    )

    expect(result).toEqual([
      {
        transactionId: 'tx-2',
        personId: null,
        splits: [
          { personId: 'self', amountCents: 5373 },
          { personId: 'ana', amountCents: 5372 },
        ],
      },
    ])
  })

  it('só mexe em parcela criada agora: a que já existia (editada pelo usuário) fica como está', () => {
    const rows = [row({ personId: 'ana' }), next({ personId: 'bia' })]

    expect(inheritInstallmentAssignments(rows, new Set())).toEqual([])
  })

  it('não mistura compras: parcela de outra compra não é referência', () => {
    const other = row({
      id: 'tx-9',
      description: 'RAMSONS STUDI PARC 01/10 MANAUS      BR',
      personId: 'ana',
      amountCents: 22991,
    })

    expect(inheritInstallmentAssignments([other, next()], new Set(['tx-2']))).toEqual([])
  })

  it('sem parcela anterior não herda nada, e já igual à referência não gera escrita', () => {
    expect(inheritInstallmentAssignments([next()], new Set(['tx-2']))).toEqual([])
    expect(inheritInstallmentAssignments([row(), next()], new Set(['tx-2']))).toEqual([])
  })
})
