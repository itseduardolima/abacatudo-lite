import { Module } from '@nestjs/common'
import { CardHolderHintRepository } from './card-holder-hint.repository'

@Module({
  providers: [CardHolderHintRepository],
  exports: [CardHolderHintRepository],
})
export class CardHolderHintModule {}
