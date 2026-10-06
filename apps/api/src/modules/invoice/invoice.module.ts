import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module'
import { BankingModule } from '../banking/banking.module'
import { PersonModule } from '../person/person.module'
import { InvoiceController } from './invoice.controller'
import { InvoiceRepository } from './invoice.repository'
import { InvoiceService } from './invoice.service'

@Module({
  imports: [AccountModule, PersonModule, BankingModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository],
  exports: [InvoiceService],
})
export class InvoiceModule {}
