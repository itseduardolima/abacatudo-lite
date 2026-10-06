import { Module } from '@nestjs/common'
import { FixedExpenseModule } from '../fixed-expense/fixed-expense.module'
import { InvoiceModule } from '../invoice/invoice.module'
import { PersonModule } from '../person/person.module'
import { BudgetMonthController } from './budget-month.controller'
import { BudgetMonthRepository } from './budget-month.repository'
import { BudgetMonthService } from './budget-month.service'
import { BudgetPaceController } from './budget-pace.controller'
import { BudgetPaceService } from './budget-pace.service'

@Module({
  imports: [PersonModule, InvoiceModule, FixedExpenseModule],
  controllers: [BudgetMonthController, BudgetPaceController],
  providers: [BudgetMonthService, BudgetMonthRepository, BudgetPaceService],
  exports: [BudgetMonthService, BudgetMonthRepository],
})
export class BudgetModule {}
