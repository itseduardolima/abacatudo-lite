import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module'
import { AuthModule } from '../auth/auth.module'
import { CardHolderHintModule } from '../card-holder-hint/card-holder-hint.module'
import { PersonModule } from '../person/person.module'
import { RuleModule } from '../rule/rule.module'
import { BankingSyncRepository } from './banking-sync.repository'
import { BankingSyncJob } from './banking-sync.job'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { PluggyClient } from './pluggy/pluggy.client'
import { PluggyItemRepository } from './pluggy-item.repository'

@Module({
  imports: [AuthModule, AccountModule, PersonModule, RuleModule, CardHolderHintModule],
  controllers: [BankingController],
  providers: [BankingService, PluggyClient, PluggyItemRepository, BankingSyncRepository, BankingSyncJob],
  exports: [PluggyClient],
})
export class BankingModule {}
