import { Controller, Get, Query } from '@nestjs/common'
import type { MovementTotals, Transaction } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { MovementService } from './movement.service'

@Controller('movements')
export class MovementController {
  constructor(private readonly movements: MovementService) {}

  @Get()
  list(
    @CurrentUser() userId: string,
    @Query('month') month?: string,
    @Query('accountId') accountId?: string,
    @Query('direction') direction?: string,
    @Query('search') search?: string,
  ): Promise<Transaction[]> {
    return this.movements.listByMonth(userId, { month, accountId, direction, search })
  }

  @Get('totals')
  totals(@CurrentUser() userId: string, @Query('month') month?: string): Promise<MovementTotals> {
    return this.movements.totals(userId, month)
  }
}
