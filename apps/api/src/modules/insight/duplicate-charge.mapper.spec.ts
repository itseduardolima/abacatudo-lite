import { detectDuplicateCharges } from './duplicate-charge.mapper'
import type { SpendingRow } from './insight.mapper'

const SELF = 'self-1'
const at = (isoDateTime: string) => new Date(isoDateTime)

function row(overrides: Partial<SpendingRow> = {}): SpendingRow {
  return {
    kind: 'EXPENSE',
    amountCents: 4200,
    occurredAt: at('2026-09-10T12:00:00.000Z'),
    installment: null,
    categoryId: null,
    categoryName: null,
    merchant: 'Mercado Livre',
    personId: SELF,
    personName: 'Eu',
    splits: [],
    ...overrides,
  }
}

describe('detectDuplicateCharges', () => {
  it('marca mesmo estabelecimento e valor cobrados duas vezes em até 24h', () => {
    const rows = [
      row({ occurredAt: at('2026-09-10T12:00:00.000Z') }),
      row({ occurredAt: at('2026-09-10T20:00:00.000Z') }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([
      expect.objectContaining({
        label: 'Mercado Livre',
        amountCents: 4200,
        firstChargeAt: '2026-09-10T12:00:00.000Z',
        secondChargeAt: '2026-09-10T20:00:00.000Z',
      }),
    ])
  })

  it('fora da janela de 24h não é duplicidade', () => {
    const rows = [
      row({ occurredAt: at('2026-09-10T12:00:00.000Z') }),
      row({ occurredAt: at('2026-09-12T12:00:00.000Z') }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([])
  })

  it('valores diferentes não são duplicidade', () => {
    const rows = [
      row({ occurredAt: at('2026-09-10T12:00:00.000Z'), amountCents: 4200 }),
      row({ occurredAt: at('2026-09-10T20:00:00.000Z'), amountCents: 5000 }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([])
  })

  it('estabelecimentos diferentes não são duplicidade', () => {
    const rows = [
      row({ occurredAt: at('2026-09-10T12:00:00.000Z'), merchant: 'Mercado Livre' }),
      row({ occurredAt: at('2026-09-10T20:00:00.000Z'), merchant: 'Amazon' }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([])
  })

  it('sem merchant não entra na comparação', () => {
    const rows = [
      row({ occurredAt: at('2026-09-10T12:00:00.000Z'), merchant: null }),
      row({ occurredAt: at('2026-09-10T20:00:00.000Z'), merchant: null }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([])
  })

  it('conta só a fatia do dono quando a compra é dividida', () => {
    const rows = [
      row({
        occurredAt: at('2026-09-10T12:00:00.000Z'),
        amountCents: 4200,
        splits: [
          { personId: SELF, personName: 'Eu', amountCents: 2100 },
          { personId: 'other', personName: 'Outra pessoa', amountCents: 2100 },
        ],
      }),
      row({
        occurredAt: at('2026-09-10T20:00:00.000Z'),
        amountCents: 4200,
        splits: [
          { personId: SELF, personName: 'Eu', amountCents: 2100 },
          { personId: 'other', personName: 'Outra pessoa', amountCents: 2100 },
        ],
      }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([expect.objectContaining({ amountCents: 2100 })])
  })

  it('REFUND nunca é cobrança duplicada', () => {
    const rows = [
      row({ occurredAt: at('2026-09-10T12:00:00.000Z') }),
      row({ occurredAt: at('2026-09-10T20:00:00.000Z'), kind: 'REFUND' }),
    ]

    expect(detectDuplicateCharges(rows, SELF)).toEqual([])
  })
})
