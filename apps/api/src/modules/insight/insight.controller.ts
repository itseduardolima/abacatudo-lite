import { Controller, Get, Query } from '@nestjs/common'
import type { SavingsReport, SpendingReport, SubscriptionReport } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { InsightService } from './insight.service'

@Controller('insights')
export class InsightController {
  constructor(private readonly insights: InsightService) {}

  @Get('spending')
  spendingReport(@CurrentUser() userId: string, @Query('month') month?: string): Promise<SpendingReport> {
    return this.insights.spendingReport(userId, month)
  }

  @Get('subscriptions')
  subscriptions(@CurrentUser() userId: string): Promise<SubscriptionReport> {
    return this.insights.subscriptions(userId)
  }

  @Get('savings')
  savings(@CurrentUser() userId: string, @Query('month') month?: string): Promise<SavingsReport> {
    return this.insights.savings(userId, month)
  }
}
