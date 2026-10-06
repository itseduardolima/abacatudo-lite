import { Body, Controller, Get, Put, Query } from '@nestjs/common'
import type { BudgetMonth } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { BudgetMonthService } from './budget-month.service'
import { UpdateBudgetMonthDto } from './dto/update-budget-month.dto'

@Controller('budget/month')
export class BudgetMonthController {
  constructor(private readonly budgetMonth: BudgetMonthService) {}

  @Get()
  get(@CurrentUser() userId: string, @Query('month') month?: string): Promise<BudgetMonth> {
    return this.budgetMonth.getOrCreate(userId, month)
  }

  @Put()
  update(
    @CurrentUser() userId: string,
    @Body() body: UpdateBudgetMonthDto,
    @Query('month') month?: string,
  ): Promise<BudgetMonth> {
    return this.budgetMonth.update(userId, month, body)
  }
}
