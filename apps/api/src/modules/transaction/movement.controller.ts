import { Controller, Get, Query } from '@nestjs/common'
import type {
  MovementHabits,
  MovementReport,
  MovementSpending,
  MovementTotals,
  PixRecipientsResponse,
  Transaction,
} from '@gastos/shared'
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

  @Get('report')
  report(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
  ): Promise<MovementReport> {
    return this.movements.report(userId, accountId, month)
  }

  @Get('spending')
  spending(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
  ): Promise<MovementSpending> {
    return this.movements.spending(userId, accountId, month)
  }

  @Get('habits')
  habits(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
  ): Promise<MovementHabits> {
    return this.movements.habits(userId, accountId, month)
  }

  @Get('pix-recipients')
  pixRecipients(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
    @Query('search') search?: string,
  ): Promise<PixRecipientsResponse> {
    return this.movements.pixRecipients(userId, accountId, month, search)
  }

  @Get('pix')
  pixTransactions(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('recipient') recipient?: string,
    @Query('month') month?: string,
  ): Promise<Transaction[]> {
    return this.movements.pixTransactions(userId, accountId, recipient, month)
  }

  @Get('totals')
  totals(@CurrentUser() userId: string, @Query('month') month?: string): Promise<MovementTotals> {
    return this.movements.totals(userId, month)
  }
}
