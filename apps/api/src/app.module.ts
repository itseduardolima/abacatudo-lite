import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ZodValidationPipe } from 'nestjs-zod'
import { validateEnv } from './common/config/env'
import { DomainExceptionFilter } from './common/filters/domain-exception.filter'
import { AuthGuard } from './common/guards/auth.guard'
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware'
import { SessionMiddleware } from './common/middlewares/session.middleware'
import { AccountModule } from './modules/account/account.module'
import { AiModule } from './modules/ai/ai.module'
import { AuthModule } from './modules/auth/auth.module'
import { BankingModule } from './modules/banking/banking.module'
import { BudgetModule } from './modules/budget/budget.module'
import { CategoryModule } from './modules/category/category.module'
import { FixedExpenseModule } from './modules/fixed-expense/fixed-expense.module'
import { HealthModule } from './modules/health/health.module'
import { InsightModule } from './modules/insight/insight.module'
import { InvoiceModule } from './modules/invoice/invoice.module'
import { MailModule } from './modules/mail/mail.module'
import { PersonModule } from './modules/person/person.module'
import { TransactionModule } from './modules/transaction/transaction.module'
import { PrismaModule } from './prisma/prisma.module'

// Módulos de domínio entram aqui conforme forem criados, um por vez.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Ligado por padrão em todo ambiente; só o .env de dev local desliga (08-seguranca § 5).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const enabled = config.get<string>('RATE_LIMIT_ENABLED', 'true') !== 'false'
        return [{ ttl: 60_000, limit: 120, skipIf: () => !enabled }]
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    AccountModule,
    PersonModule,
    CategoryModule,
    BankingModule,
    TransactionModule,
    InvoiceModule,
    BudgetModule,
    FixedExpenseModule,
    InsightModule,
    AiModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // RequestIdMiddleware primeiro, sem exclude: todo log de toda rota precisa do requestId já no
    // AsyncLocalStorage antes do resto da cadeia rodar (09-operacao § 3).
    consumer.apply(RequestIdMiddleware).forRoutes('*path')

    // SessionMiddleware resolve a sessão e estabelece o userId no contexto (ver o comentário em
    // SessionMiddleware) — health fica de fora, não faz sentido gastar uma consulta por checagem de
    // uptime (09-operacao § 1).
    consumer.apply(SessionMiddleware).exclude('health').forRoutes('*path')
  }
}
