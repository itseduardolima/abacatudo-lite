import { detectSubscriptions, type SubscriptionRow } from './subscription.mapper'

const SELF = 'self-1'
const TODAY = new Date('2026-09-25T15:00:00.000Z')

// Meio-dia em Manaus (UTC-4): cai no mesmo dia em UTC, sem surpresa de fuso.
const at = (date: string) => new Date(`${date}T15:00:00.000Z`)

function charge(date: string, overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    kind: 'EXPENSE',
    amountCents: 5590,
    occurredAt: at(date),
    merchant: 'Netflix',
    description: 'NETFLIX.COM',
    personId: SELF,
    splits: [],
    ...overrides,
  }
}

const monthly = (day: string, months: string[], overrides: Partial<SubscriptionRow> = {}) =>
  months.map((month) => charge(`${month}-${day}`, overrides))

describe('detectSubscriptions', () => {
  it('detecta cobrança mensal com 3 ocorrências e calcula mensal e anual', () => {
    const report = detectSubscriptions(monthly('08', ['2026-07', '2026-08', '2026-09']), SELF, TODAY)

    expect(report.items).toEqual([
      expect.objectContaining({
        label: 'Netflix',
        monthlyCents: 5590,
        yearlyCents: 5590 * 12,
        chargeDay: 8,
        occurrences: 3,
      }),
    ])
    expect(report.totalMonthlyCents).toBe(5590)
    expect(report.totalYearlyCents).toBe(5590 * 12)
  })

  it('exige 3 ocorrências: duas cobranças não são recorrência', () => {
    expect(detectSubscriptions(monthly('08', ['2026-08', '2026-09']), SELF, TODAY).items).toEqual([])
  })

  it('aceita variação de até 10% no valor', () => {
    const rows = [
      charge('2026-07-08', { amountCents: 5000 }),
      charge('2026-08-08', { amountCents: 5250 }),
      charge('2026-09-08', { amountCents: 5500 }), // 10% sobre 5000 é o limite; a âncora é a última (5500)
    ]
    expect(detectSubscriptions(rows, SELF, TODAY).items).toHaveLength(1)
  })

  it('rejeita quando o valor varia mais que 10%', () => {
    const rows = [
      charge('2026-07-08', { amountCents: 3000 }),
      charge('2026-08-08', { amountCents: 5000 }),
      charge('2026-09-08', { amountCents: 8000 }),
    ]
    expect(detectSubscriptions(rows, SELF, TODAY).items).toEqual([])
  })

  it('aceita intervalo de 26 a 34 dias entre cobranças', () => {
    const rows = [charge('2026-07-11'), charge('2026-08-08'), charge('2026-09-11')] // 28 e 34 dias
    expect(detectSubscriptions(rows, SELF, TODAY).items).toHaveLength(1)
  })

  it('rejeita intervalo fora de ~30 dias (ex.: cobrança a cada 45 dias)', () => {
    const rows = [charge('2026-06-01'), charge('2026-07-16'), charge('2026-08-30')]
    expect(detectSubscriptions(rows, SELF, TODAY).items).toEqual([])
  })

  it('ignora assinatura cancelada (última cobrança há mais de 40 dias)', () => {
    expect(detectSubscriptions(monthly('08', ['2026-05', '2026-06', '2026-07']), SELF, TODAY).items).toEqual([])
  })

  it('uma compra avulsa de outro valor no meio não quebra a sequência', () => {
    const rows = [
      ...monthly('08', ['2026-07', '2026-08', '2026-09']),
      charge('2026-08-20', { amountCents: 19900 }), // compra avulsa no mesmo estabelecimento
    ]
    const report = detectSubscriptions(rows, SELF, TODAY)
    expect(report.items[0]).toMatchObject({ monthlyCents: 5590, occurrences: 3 })
  })

  it('se a última cobrança é avulsa, acha a assinatura pelas anteriores', () => {
    const rows = [...monthly('08', ['2026-07', '2026-08', '2026-09']), charge('2026-09-20', { amountCents: 19900 })]
    const report = detectSubscriptions(rows, SELF, TODAY)
    expect(report.items[0]).toMatchObject({ monthlyCents: 5590, occurrences: 3, chargeDay: 8 })
  })

  it('cobrança duplicada colada (< 26 dias) não vira uma ocorrência a mais', () => {
    const rows = [...monthly('08', ['2026-08', '2026-09']), charge('2026-08-09'), charge('2026-07-08')]
    const report = detectSubscriptions(rows, SELF, TODAY)
    expect(report.items[0]?.occurrences).toBe(3)
  })

  it('agrupa por estabelecimento normalizado ("Netflix" e "netflix ")', () => {
    const rows = [charge('2026-07-08'), charge('2026-08-08', { merchant: 'netflix ' }), charge('2026-09-08')]
    expect(detectSubscriptions(rows, SELF, TODAY).items).toHaveLength(1)
  })

  it('sem estabelecimento, agrupa pela descrição', () => {
    const rows = monthly('08', ['2026-07', '2026-08', '2026-09'], { merchant: null, description: 'PG *NIO FIBRA' })
    expect(detectSubscriptions(rows, SELF, TODAY).items[0]).toMatchObject({ label: 'PG *NIO FIBRA' })
  })

  it('descarta a cidade que o cartão cola depois do nome (bloco de espaços) no nome e no agrupamento', () => {
    const rows = [
      charge('2026-07-08', { merchant: null, description: 'PG *NIO FIBRA          RIO DE JANEIR BR' }),
      charge('2026-08-08', { merchant: null, description: 'PG *NIO FIBRA    SAO PAULO BR' }),
      charge('2026-09-08', { merchant: null, description: 'PG *NIO FIBRA          RIO DE JANEIR BR' }),
    ]
    const report = detectSubscriptions(rows, SELF, TODAY)
    expect(report.items).toHaveLength(1)
    expect(report.items[0]?.label).toBe('PG *NIO FIBRA')
  })

  it('apara espaços nas pontas e mantém o espaço simples entre as palavras', () => {
    const rows = monthly('08', ['2026-07', '2026-08', '2026-09'], { merchant: '  Loja X  ' })
    expect(detectSubscriptions(rows, SELF, TODAY).items[0]?.label).toBe('Loja X')
  })

  it('só conta a parte do dono: cobrança de outra pessoa não é assinatura sua', () => {
    const rows = monthly('08', ['2026-07', '2026-08', '2026-09'], { personId: 'other-1' })
    expect(detectSubscriptions(rows, SELF, TODAY).items).toEqual([])
  })

  it('cobrança dividida conta só a fatia do dono', () => {
    const rows = monthly('08', ['2026-07', '2026-08', '2026-09'], {
      personId: null,
      splits: [
        { personId: SELF, personName: 'Eu', amountCents: 2000 },
        { personId: 'other-1', personName: 'Mãe', amountCents: 3590 },
      ],
    })
    expect(detectSubscriptions(rows, SELF, TODAY).items[0]).toMatchObject({ monthlyCents: 2000 })
  })

  it('cobrança com data futura não conta como recente nem como ocorrência', () => {
    const rows = [...monthly('08', ['2026-07', '2026-08']), charge('2026-10-08')]
    expect(detectSubscriptions(rows, SELF, TODAY).items).toEqual([])
  })

  it('estorno nunca é cobrança de assinatura', () => {
    const rows = [...monthly('08', ['2026-07', '2026-08']), charge('2026-09-08', { kind: 'REFUND' as never })]
    expect(detectSubscriptions(rows, SELF, TODAY).items).toEqual([])
  })

  it('ordena do mais caro pro mais barato e soma os totais', () => {
    const rows = [
      ...monthly('08', ['2026-07', '2026-08', '2026-09'], { merchant: 'Spotify', amountCents: 2190 }),
      ...monthly('12', ['2026-07', '2026-08', '2026-09'], { merchant: 'Disney+', amountCents: 3390 }),
    ]
    const report = detectSubscriptions(rows, SELF, TODAY)
    expect(report.items.map((i) => i.label)).toEqual(['Disney+', 'Spotify'])
    expect(report.totalMonthlyCents).toBe(2190 + 3390)
    expect(report.totalYearlyCents).toBe((2190 + 3390) * 12)
  })
})
