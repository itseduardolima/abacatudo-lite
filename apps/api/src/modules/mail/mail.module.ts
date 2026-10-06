import { Global, Module } from '@nestjs/common'
import { MailService } from './mail.service'

// @Global(): MailService é infraestrutura (como PrismaModule), não regra de domínio — qualquer módulo
// futuro que precise mandar e-mail usa sem precisar importar MailModule explicitamente.
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
