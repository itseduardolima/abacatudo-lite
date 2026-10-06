import { Module } from '@nestjs/common'
import { PersonModule } from '../person/person.module'
import { InsightController } from './insight.controller'
import { InsightRepository } from './insight.repository'
import { InsightService } from './insight.service'

@Module({
  imports: [PersonModule],
  controllers: [InsightController],
  providers: [InsightService, InsightRepository],
})
export class InsightModule {}
