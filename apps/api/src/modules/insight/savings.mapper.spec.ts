import type { DuplicateCharge, SpendingBreakdownItem, SubscriptionItem } from '@gastos/shared'
import { buildSavingsReport } from './savings.mapper'

function category(overrides: Partial<SpendingBreakdownItem> = {}): SpendingBreakdownItem {
  return {
    key: 'cat-1',
    label: 'Mercado',
    amountCents: 30000,
    previousMonthCents: 20000,
    vsPreviousMonthPercent: 50,
    averageLast3MonthsCents: 20000,
    vsAverageLast3MonthsPercent: 50,
    aboveNormal: true,
    ...overrides,
  }
}

function subscription(overrides: Partial<SubscriptionItem> = {}): SubscriptionItem {
  return {
    key: 'netflix',
    label: 'Netflix',
    monthlyCents: 5590,
    yearlyCents: 5590 * 12,
    chargeDay: 8,
    lastChargeAt: '2026-09-08T12:00:00.000Z',
    occurrences: 3,
    ...overrides,
  }
}

function duplicate(overrides: Partial<DuplicateCharge> = {}): DuplicateCharge {
  return {
    key: 'mercado-1',
    label: 'Mercado Livre',
    amountCents: 4200,
    firstChargeAt: '2026-09-10T12:00:00.000Z',
    secondChargeAt: '2026-09-10T20:00:00.000Z',
    ...overrides,
  }
}

describe('buildSavingsReport', () => {
  it('junta os três sinais num ranking por potencial, do maior pro menor', () => {
    const items = buildSavingsReport(
      [category({ amountCents: 10500, averageLast3MonthsCents: 10000 })], // potencial 500
      [subscription({ monthlyCents: 5590 })], // potencial 5590
      [duplicate({ amountCents: 4200 })], // potencial 4200
    )

    expect(items.map((item) => item.type)).toEqual(['SUBSCRIPTION', 'DUPLICATE_CHARGE', 'ABOVE_NORMAL_CATEGORY'])
    expect(items.map((item) => item.amountCents)).toEqual([5590, 4200, 500])
  })

  it('ignora categoria que não está acima do normal', () => {
    const items = buildSavingsReport([category({ aboveNormal: false })], [], [])
    expect(items).toEqual([])
  })

  it('cada item traz o cálculo e a chave de origem', () => {
    const items = buildSavingsReport([], [subscription()], [])
    expect(items).toEqual([
      expect.objectContaining({
        type: 'SUBSCRIPTION',
        sourceKey: 'netflix',
        calculation: expect.stringContaining('todo dia 8'),
      }),
    ])
  })
})
