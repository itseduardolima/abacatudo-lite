import { computeInvoice } from './invoice.mapper'
import {
  buildPersonStatements,
  formatBrl,
  formatStatementText,
  type StatementCardInput,
  type StatementRow,
} from './statement.mapper'

const PEOPLE = [
  { id: 'self-1', name: 'Eu', isSelf: true },
  { id: 'ana', name: 'Ana', isSelf: false },
  { id: 'bia', name: 'Bia', isSelf: false },
]

function row(overrides: Partial<StatementRow> = {}): StatementRow {
  return {
    kind: 'EXPENSE',
    amountCents: 1000,
    personId: 'ana',
    splits: [],
    installment: null,
    label: 'Compra',
    installmentNumber: null,
    installmentTotal: null,
    sortAt: new Date('2026-09-10T12:00:00.000Z'),
    ...overrides,
  }
}

function card(rows: StatementRow[], overrides: Partial<StatementCardInput> = {}): StatementCardInput {
  return { accountId: 'card-1', accountName: 'Nubank gold', dueDay: 10, rows, ...overrides }
}

describe('formatBrl', () => {
  it('formata centavos em pt-BR com milhar, sem espaço especial', () => {
    expect(formatBrl(4500)).toBe('R$ 45,00')
    expect(formatBrl(21204)).toBe('R$ 212,04')
    expect(formatBrl(123456789)).toBe('R$ 1.234.567,89')
    expect(formatBrl(5)).toBe('R$ 0,05')
    expect(formatBrl(-1050)).toBe('-R$ 10,50')
  })
})

describe('buildPersonStatements', () => {
  it('agrupa por pessoa não-self, ignora self, pagamento de fatura e compra sem dono', () => {
    const statements = buildPersonStatements(
      [
        card([
          row({ personId: 'ana', amountCents: 4500, label: 'Fogão' }),
          row({ personId: 'self-1', amountCents: 9999 }),
          row({ personId: null, amountCents: 7777 }),
          row({ kind: 'CARD_PAYMENT', personId: 'ana', amountCents: 3000 }),
        ]),
      ],
      PEOPLE,
    )

    expect(statements).toHaveLength(1)
    expect(statements[0]).toMatchObject({ personId: 'ana', personName: 'Ana', totalCents: 4500 })
  })

  it('split conta só a fatia de cada pessoa, não o valor cheio', () => {
    const statements = buildPersonStatements(
      [
        card([
          row({
            amountCents: 10000,
            personId: 'self-1',
            splits: [
              { personId: 'self-1', amountCents: 5000 },
              { personId: 'ana', amountCents: 3000 },
              { personId: 'bia', amountCents: 2000 },
            ],
          }),
        ]),
      ],
      PEOPLE,
    )

    expect(statements.map((s) => [s.personName, s.totalCents])).toEqual([
      ['Ana', 3000],
      ['Bia', 2000],
    ])
  })

  it('invariante: Meu + soma das pessoas + sem dono fecha com a fatura, centavo a centavo', () => {
    const rows = [
      row({ personId: 'self-1', amountCents: 10001 }),
      row({ personId: 'ana', amountCents: 4503 }),
      row({ personId: null, amountCents: 777 }),
      row({
        personId: 'self-1',
        amountCents: 9001,
        splits: [
          { personId: 'self-1', amountCents: 4001 },
          { personId: 'bia', amountCents: 5000 },
        ],
      }),
      row({ kind: 'REFUND', personId: 'ana', amountCents: 503 }),
    ]

    const invoice = computeInvoice(rows, 'self-1')
    const statements = buildPersonStatements([card(rows)], PEOPLE)
    const persons = statements.reduce((sum, s) => sum + s.totalCents, 0)
    const unassigned = 777

    expect(invoice.totalCents).toBe(invoice.mineCents + invoice.notMineCents)
    expect(invoice.notMineCents).toBe(persons + unassigned)
  })

  it('estorno abate o total da pessoa; total zerado ou negativo não gera mensagem', () => {
    const statements = buildPersonStatements(
      [
        card([
          row({ personId: 'ana', amountCents: 5000 }),
          row({ kind: 'REFUND', personId: 'ana', amountCents: 1500 }),
          row({ personId: 'bia', amountCents: 2000 }),
          row({ kind: 'REFUND', personId: 'bia', amountCents: 2000 }),
        ]),
      ],
      PEOPLE,
    )

    expect(statements.map((s) => [s.personName, s.totalCents])).toEqual([['Ana', 3500]])
  })

  it('ordena as compras pela data e as pessoas pelo nome', () => {
    const statements = buildPersonStatements(
      [
        card([
          row({ personId: 'bia', label: 'B', sortAt: new Date('2026-09-05T12:00:00.000Z') }),
          row({ personId: 'ana', label: 'Tarde', sortAt: new Date('2026-09-20T12:00:00.000Z') }),
          row({ personId: 'ana', label: 'Cedo', sortAt: new Date('2026-09-02T12:00:00.000Z') }),
        ]),
      ],
      PEOPLE,
    )

    expect(statements.map((s) => s.personName)).toEqual(['Ana', 'Bia'])
    expect(statements[0]?.cards[0]?.lines.map((line) => line.label)).toEqual(['Cedo', 'Tarde'])
  })
})

describe('formatStatementText', () => {
  it('um cartão: compras, parcela n/N, "última", vencimento e total — sem o nome do cartão', () => {
    const [statement] = buildPersonStatements(
      [
        card([
          row({ label: 'Fogão', amountCents: 4500, sortAt: new Date('2026-09-01T12:00:00.000Z') }),
          row({
            label: 'Air fryer',
            amountCents: 21204,
            installmentNumber: 12,
            installmentTotal: 12,
            sortAt: new Date('2026-09-02T12:00:00.000Z'),
          }),
          row({
            label: 'TV',
            amountCents: 34990,
            installmentNumber: 3,
            installmentTotal: 10,
            sortAt: new Date('2026-09-03T12:00:00.000Z'),
          }),
        ]),
      ],
      PEOPLE,
    )

    expect(statement && formatStatementText(statement, '2026-09', false)).toBe(
      [
        'Sua conta de setembro',
        '',
        'Fogão: R$ 45,00',
        'Air fryer: R$ 212,04 (12/12 - última)',
        'TV: R$ 349,90 (3/10)',
        'Pagar até dia 10',
        '',
        'Total: R$ 606,94',
      ].join('\n'),
    )
  })

  it('vários cartões: uma seção por cartão, cada uma com o seu vencimento; previsão vai marcada', () => {
    const [statement] = buildPersonStatements(
      [
        card([row({ label: 'Fogão', amountCents: 1000 })]),
        card([row({ label: 'Mercado', amountCents: 2000 })], {
          accountId: 'card-2',
          accountName: 'Pic Pay',
          dueDay: 15,
        }),
      ],
      PEOPLE,
    )

    expect(statement && formatStatementText(statement, '2026-11', true)).toBe(
      [
        'Sua conta de novembro (previsão)',
        '',
        'Nubank gold\nFogão: R$ 10,00\nPagar até dia 10',
        '',
        'Pic Pay\nMercado: R$ 20,00\nPagar até dia 15',
        '',
        'Total: R$ 30,00',
      ].join('\n'),
    )
  })

  it('cartão sem dia de vencimento: a linha "Pagar até" some', () => {
    const [statement] = buildPersonStatements([card([row()], { dueDay: null })], PEOPLE)

    expect(statement && formatStatementText(statement, '2026-09', false)).not.toContain('Pagar até')
  })
})
