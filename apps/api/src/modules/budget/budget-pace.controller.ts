import { Controller, Get, Query } from '@nestjs/common'
import type { BudgetPace } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { BudgetPaceService } from './budget-pace.service'

@Controller('budget/pace')
export class BudgetPaceController {
  constructor(private readonly pace: BudgetPaceService) {}

  @Get()
  get(@CurrentUser() userId: string, @Query('month') month?: string): Promise<BudgetPace> {
    return this.pace.getPace(userId, month)
  }
}
