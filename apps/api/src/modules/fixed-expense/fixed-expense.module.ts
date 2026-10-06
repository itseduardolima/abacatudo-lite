import { Module } from '@nestjs/common'
import { FixedExpenseController } from './fixed-expense.controller'
import { FixedExpenseRepository } from './fixed-expense.repository'
import { FixedExpenseService } from './fixed-expense.service'

@Module({
  controllers: [FixedExpenseController],
  providers: [FixedExpenseService, FixedExpenseRepository],
  exports: [FixedExpenseService],
})
export class FixedExpenseModule {}
