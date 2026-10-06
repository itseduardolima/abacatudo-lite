import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module'
import { CardHolderHintModule } from '../card-holder-hint/card-holder-hint.module'
import { CategoryModule } from '../category/category.module'
import { PersonModule } from '../person/person.module'
import { RuleModule } from '../rule/rule.module'
import { SplitModule } from '../split/split.module'
import { SplitService } from './split.service'
import { TransactionController } from './transaction.controller'
import { TransactionRepository } from './transaction.repository'
import { TransactionService } from './transaction.service'

@Module({
  imports: [PersonModule, CategoryModule, RuleModule, SplitModule, CardHolderHintModule, AccountModule],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionRepository, SplitService],
})
export class TransactionModule {}
