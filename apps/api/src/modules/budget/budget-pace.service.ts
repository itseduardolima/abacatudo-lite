import { Injectable } from '@nestjs/common'
import type { BudgetPace } from '@gastos/shared'
import { dayOfMonth, halfMonthRange, monthKey } from '../../common/date/timezone'
import { FixedExpenseService } from '../fixed-expense/fixed-expense.service'
import { InvoiceService } from '../invoice/invoice.service'
import { BudgetMonthService } from './budget-month.service'
import { computePace } from './pace.mapper'

@Injectable()
export class BudgetPaceService {
  constructor(
    private readonly budgetMonth: BudgetMonthService,
    private readonly invoices: InvoiceService,
    private readonly fixedExpenses: FixedExpenseService,
  ) {}

  // Teto = renda informada (a pedido do usuário: nem benefício, nem poupança entram aqui — cada um tem
  // seu próprio lugar, não competem pelo mesmo teto). Gasto = fatura aberta somada em todos os cartões
  // (InvoiceService.getSummary) + gastos fixos ativos (aluguel, internet...) — os dois já eram "meu gasto
  // do mês" antes de existir orçamento, só nunca tinham sido somados juntos.
  async getPace(userId: string, month?: string): Promise<BudgetPace> {
    const [budget, invoice, fixedExpensesCents] = await Promise.all([
      this.budgetMonth.getOrCreate(userId, month),
      this.invoices.getSummary(userId, month),
      this.fixedExpenses.sumActiveCents(userId),
    ])

    const pace = computePace({
      monthKeyValue: budget.month,
      currentMonthKey: monthKey(new Date()),
      todayDayOfMonth: dayOfMonth(new Date()),
      capCents: budget.incomeCents,
      spentCents: invoice.mineCents + fixedExpensesCents,
      cardsMineCents: invoice.mineCents,
    })
    const isCurrentMonth = budget.month === monthKey(new Date())
    const currentHalf = dayOfMonth(new Date()) <= 15 ? 1 : 2
    const [firstHalfSpentCents, currentHalfSpentCents] = isCurrentMonth
      ? await Promise.all([
          this.halfSpentCents(userId, budget.month, 1),
          currentHalf === 1 ? undefined : this.halfSpentCents(userId, budget.month, 2),
        ])
      : [null, undefined]
    const currentHalfCapCents = currentHalf === 1 ? budget.firstHalfIncomeCents : budget.secondHalfIncomeCents
    const currentHalfSpent = currentHalf === 1 ? firstHalfSpentCents : (currentHalfSpentCents ?? null)
    return {
      ...pace,
      firstHalfCapCents: budget.firstHalfIncomeCents,
      firstHalfSpentCents,
      currentHalf: isCurrentMonth ? (currentHalf as 1 | 2) : null,
      currentHalfRemainingCents: currentHalfSpent === null ? null : currentHalfCapCents - currentHalfSpent,
    }
  }

  private async halfSpentCents(userId: string, month: string, half: 1 | 2): Promise<number> {
    const [cardsCents, fixedCents] = await Promise.all([
      this.invoices.getHalfMineCents(userId, halfMonthRange(month, half)),
      this.fixedExpenses.sumActiveCentsByHalf(userId, half),
    ])
    return cardsCents + fixedCents
  }
}
