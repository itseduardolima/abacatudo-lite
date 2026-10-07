import { installmentGroupKey } from '../../common/installment-group'
import { addMonthsKeepingDay, estimateInstallments, type InstallmentSource } from './installment-forecast.mapper'

function source(overrides: Partial<InstallmentSource> = {}): InstallmentSource {
  return {
    groupKey: 'compra-a',
    number: 2,
    total: 5,
    dueAt: new Date('2026-09-17T12:00:00.000Z'),
    amountCents: 10000,
    kind: 'EXPENSE',
    personId: 'self-1',
    splits: [],
    label: 'Compra A',
    ...overrides,
  }
}

describe('addMonthsKeepingDay', () => {
  it('soma meses mantendo o dia, limitado ao fim do mês e virando o ano', () => {
    expect(addMonthsKeepingDay(new Date('2026-09-17T12:00:00.000Z'), 1).toISOString()).toBe('2026-10-17T12:00:00.000Z')
    expect(addMonthsKeepingDay(new Date('2026-01-31T12:00:00.000Z'), 1).toISOString()).toBe('2026-02-28T12:00:00.000Z')
    expect(addMonthsKeepingDay(new Date('2026-11-30T12:00:00.000Z'), 3).toISOString()).toBe('2027-02-28T12:00:00.000Z')
    expect(addMonthsKeepingDay(new Date('2027-01-31T12:00:00.000Z'), 1).toISOString()).toBe('2027-02-28T12:00:00.000Z')
  })
})

describe('addMonthsKeepingDay com a data à meia-noite de Brasília', () => {
  it('parcela do dia 1 às 03:00 UTC continua no dia 1 do mês seguinte, e não no dia 30 do anterior', () => {
    expect(addMonthsKeepingDay(new Date('2026-10-01T03:00:00.000Z'), 1).toISOString()).toBe('2026-11-01T03:00:00.000Z')
    expect(addMonthsKeepingDay(new Date('2026-01-31T03:00:00.000Z'), 1).toISOString()).toBe('2026-02-28T03:00:00.000Z')
  })
})

describe('estimateInstallments', () => {
  it('cria k+1..N com o mesmo valor, pessoa e divisão, um mês depois do outro', () => {
    const estimated = estimateInstallments([
      source({ number: 1, dueAt: new Date('2026-08-17T12:00:00.000Z') }),
      source({ number: 2, splits: [{ personId: 'ana', amountCents: 4000 }] }),
    ])

    expect(estimated.map((e) => [e.number, e.dueAt.toISOString().slice(0, 10), e.amountCents])).toEqual([
      [3, '2026-10-17', 10000],
      [4, '2026-11-17', 10000],
      [5, '2026-12-17', 10000],
    ])
    expect(estimated[0]?.splits).toEqual([{ personId: 'ana', amountCents: 4000 }])
    expect(estimated[0]?.personId).toBe('self-1')
  })

  it('quando o banco lança a próxima parcela de verdade, a estimativa encolhe e não duplica', () => {
    const before = estimateInstallments([source({ number: 2 })])
    const after = estimateInstallments([
      source({ number: 2 }),
      source({ number: 3, dueAt: new Date('2026-10-19T12:00:00.000Z') }),
    ])

    expect(before.map((e) => e.number)).toEqual([3, 4, 5])
    expect(after.map((e) => e.number)).toEqual([4, 5])
    expect(after[0]?.dueAt.toISOString().slice(0, 10)).toBe('2026-11-19')
    expect(after.some((e) => e.number === 3)).toBe(false)
  })

  it('banco que já manda todas as parcelas (k = N) não gera estimativa', () => {
    expect(
      estimateInstallments([source({ number: 1 }), source({ number: 5, dueAt: new Date('2027-01-17T12:00:00.000Z') })]),
    ).toEqual([])
  })

  it('cada compra tem a sua estimativa, sem misturar grupos', () => {
    const estimated = estimateInstallments([
      source({ groupKey: 'a', number: 4, total: 5 }),
      source({ groupKey: 'b', number: 1, total: 3, label: 'Compra B' }),
    ])

    expect(estimated.map((e) => [e.groupKey, e.number])).toEqual([
      ['a', 5],
      ['b', 2],
      ['b', 3],
    ])
  })

  it('total absurdo não gera lista enorme', () => {
    expect(estimateInstallments([source({ number: 1, total: 999 })])).toEqual([])
  })
})

describe('estimateInstallments com as descrições reais do BB', () => {
  it('uma compra em 12x com o marcador no meio da descrição gera UMA estimativa por parcela faltante, não uma por linha', () => {
    const sources = Array.from({ length: 8 }, (_, index) => {
      const number = index + 1
      const occurredAt = new Date(number >= 6 ? '2026-02-17T00:00:00.000Z' : '2026-02-18T00:19:51.000Z')
      return source({
        groupKey: installmentGroupKey({
          description: `RAMSONS STUDI PARC ${String(number).padStart(2, '0')}/12 MANAUS      BR`,
          occurredAt,
          installmentTotal: 12,
          installmentNumber: number,
        }),
        number,
        total: 12,
        dueAt: new Date(`2026-0${Math.min(number + 1, 9)}-19T12:00:00.000Z`),
      })
    })

    const estimated = estimateInstallments(sources)

    expect(estimated.map((item) => item.number)).toEqual([9, 10, 11, 12])
  })
})
