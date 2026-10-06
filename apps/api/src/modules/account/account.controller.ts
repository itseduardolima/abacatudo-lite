import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common'
import type { Account } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AccountService } from './account.service'
import { UpdateAccountDto } from './dto/update-account.dto'

@Controller('accounts')
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('includeArchived') includeArchived?: string): Promise<Account[]> {
    return this.accounts.list(userId, includeArchived === 'true')
  }

  @Get(':id')
  getById(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Account> {
    return this.accounts.getById(userId, id)
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAccountDto,
  ): Promise<Account> {
    return this.accounts.update(userId, id, body)
  }

  @Patch(':id/restore')
  @HttpCode(204)
  restore(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accounts.restore(userId, id)
  }

  @Patch(':id/archive')
  @HttpCode(204)
  archive(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accounts.archive(userId, id)
  }
}
