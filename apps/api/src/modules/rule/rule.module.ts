import { Module } from '@nestjs/common'
import { RuleRepository } from './rule.repository'

@Module({
  providers: [RuleRepository],
  exports: [RuleRepository],
})
export class RuleModule {}
