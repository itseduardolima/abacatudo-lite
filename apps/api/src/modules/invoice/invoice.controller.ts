import { Controller, Get, Query } from '@nestjs/common'
import type { AccountInvoice, EstimatedInstallmentsResponse, Invoice, StatementsResponse } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { InvoiceService } from './invoice.service'

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Get()
  getForAccount(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
  ): Promise<AccountInvoice> {
    return this.invoices.getForAccount(userId, accountId, month)
  }

  @Get('estimates')
  getEstimates(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
  ): Promise<EstimatedInstallmentsResponse> {
    return this.invoices.getEstimates(userId, accountId, month)
  }

  @Get('statements')
  getStatements(@CurrentUser() userId: string, @Query('month') month?: string): Promise<StatementsResponse> {
    return this.invoices.getStatements(userId, month)
  }

  @Get('summary')
  getSummary(@CurrentUser() userId: string): Promise<Invoice> {
    return this.invoices.getSummary(userId)
  }
}
