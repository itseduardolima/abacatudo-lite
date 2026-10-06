import type { Invoice } from '@gastos/shared'
import { BudgetPaceService } from './budget-pace.service'
import type { BudgetMonthService } from './budget-month.service'
import type { FixedExpenseService } from '../fixed-expense/fixed-expense.service'
import type { InvoiceService } from '../invoice/invoice.service'

function budgetMonthMock(incomeCents: number, month = '2026-09') {
  return {
    getOrCreate: jest.fn().mockResolvedValue({
      month,
      incomeCents,
      firstHalfIncomeCents: incomeCents / 2,
      secondHalfIncomeCents: incomeCents / 2,
      benefitCents: 0,
      fixedExpensesCents: 0,
      savingsGoalCents: 0,
      variableCapCents: 0,
    }),
  } as unknown as jest.Mocked<BudgetMonthService>
}

function invoicesMock(mineCents: number) {
  const summary: Invoice = { totalCents: mineCents + 1000, mineCents, notMineCents: 1000 }
  return {
    getSummary: jest.fn().mockResolvedValue(summary),
    getHalfMineCents: jest.fn().mockResolvedValue(mineCents / 2),
  } as unknown as jest.Mocked<InvoiceService>
}

function fixedExpensesMock(sumCents: number) {
  return {
    sumActiveCents: jest.fn().mockResolvedValue(sumCents),
    sumActiveCentsByHalf: jest.fn().mockResolvedValue(sumCents / 2),
  } as unknown as jest.Mocked<FixedExpenseService>
}

describe('BudgetPaceService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  it('teto = renda; gasto = fatura aberta (todos os cartões) + gastos fixos ativos', async () => {
    const budgetMonth = budgetMonthMock(300_000)
    const invoices = invoicesMock(50_000)
    const fixedExpenses = fixedExpensesMock(20_000)
    const service = new BudgetPaceService(budgetMonth, invoices, fixedExpenses)

    const result = await service.getPace('user-1')

    expect(budgetMonth.getOrCreate).toHaveBeenCalledWith('user-1', undefined)
    expect(invoices.getSummary).toHaveBeenCalledWith('user-1', undefined)
    expect(fixedExpenses.sumActiveCents).toHaveBeenCalledWith('user-1')
    expect(result.capCents).toBe(300_000)
    expect(result.spentCents).toBe(70_000)
    expect(result.cardsMineCents).toBe(50_000)
    expect(result.month).toBe('2026-09')
    expect(result.firstHalfCapCents).toBe(150_000)
    expect(result.firstHalfSpentCents).toBe(35_000)
    expect(result.currentHalf).toBe(1)
    expect(result.currentHalfRemainingCents).toBe(115_000)
  })

  it('sem gasto fixo nenhum, gasto é só a fatura', async () => {
    const budgetMonth = budgetMonthMock(100_000)
    const invoices = invoicesMock(15_000)
    const fixedExpenses = fixedExpensesMock(0)
    const service = new BudgetPaceService(budgetMonth, invoices, fixedExpenses)

    const result = await service.getPace('user-1', '2026-08')

    expect(budgetMonth.getOrCreate).toHaveBeenCalledWith('user-1', '2026-08')
    expect(invoices.getSummary).toHaveBeenCalledWith('user-1', '2026-08')
    expect(result.spentCents).toBe(15_000)
  })

  it('gasto da 1ª quinzena só existe no mês atual', async () => {
    const service = new BudgetPaceService(
      budgetMonthMock(100_000, '2026-10'),
      invoicesMock(10_000),
      fixedExpensesMock(0),
    )

    const result = await service.getPace('user-1', '2026-10')

    expect(result.firstHalfSpentCents).toBeNull()
    expect(result.currentHalf).toBeNull()
    expect(result.currentHalfRemainingCents).toBeNull()
  })

  it('a partir do dia 16, o que sobra é o da 2ª quinzena, contra o segundo salário', async () => {
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    const service = new BudgetPaceService(budgetMonthMock(300_000), invoicesMock(50_000), fixedExpensesMock(20_000))

    const result = await service.getPace('user-1')

    expect(result.currentHalf).toBe(2)
    expect(result.currentHalfRemainingCents).toBe(150_000 - 35_000)
    expect(result.firstHalfSpentCents).toBe(35_000)
  })
})
