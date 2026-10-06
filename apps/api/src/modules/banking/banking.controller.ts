import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import type { BankConnection, ConnectBankResponse, SyncResult } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { BankingService } from './banking.service'

@Controller('banking/items')
export class BankingController {
  constructor(private readonly banking: BankingService) {}

  @Post()
  connect(@CurrentUser() userId: string): Promise<ConnectBankResponse> {
    return this.banking.connect(userId)
  }

  @Get()
  list(@CurrentUser() userId: string): Promise<BankConnection[]> {
    return this.banking.listItems(userId)
  }

  @Get(':id')
  checkStatus(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<BankConnection> {
    return this.banking.checkStatus(userId, id)
  }

  @Post(':id/sync')
  sync(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<SyncResult> {
    return this.banking.manualSync(userId, id)
  }

  @Delete(':id')
  disconnect(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<BankConnection> {
    return this.banking.disconnect(userId, id)
  }

  @Patch(':id/reconnect')
  reconnect(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<ConnectBankResponse> {
    return this.banking.reconnect(userId, id)
  }
}
