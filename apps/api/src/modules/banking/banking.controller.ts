import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import type {
  BankConnection,
  ConnectBankResponse,
  RegisterBankItemResponse,
  SyncResult,
} from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { BankingService } from './banking.service'
import { RegisterBankItemDto } from './dto/register-bank-item.dto'

@Controller('banking/items')
export class BankingController {
  constructor(private readonly banking: BankingService) {}

  @Post()
  connect(): Promise<ConnectBankResponse> {
    return this.banking.connect()
  }

  @Post('register')
  register(@CurrentUser() userId: string, @Body() body: RegisterBankItemDto): Promise<RegisterBankItemResponse> {
    return this.banking.register(userId, body)
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
