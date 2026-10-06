import { Module } from '@nestjs/common'
import { SplitRepository } from './split.repository'

@Module({
  providers: [SplitRepository],
  exports: [SplitRepository],
})
export class SplitModule {}
