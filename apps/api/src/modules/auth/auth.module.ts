import { Module } from '@nestjs/common'
import { PersonModule } from '../person/person.module'
import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repository'
import { AuthService } from './auth.service'
import { LoginAttemptTracker } from './login-attempt.tracker'
import { PasswordResetService } from './password-reset.service'
import { TwoFactorService } from './two-factor.service'

// Exporta AuthService (não SessionMiddleware): o middleware é instanciado pelo AppModule via
// consumer.apply(), que resolve o construtor dele a partir do que o AppModule enxerga — bastando
// importar este módulo. Mesmo padrão do TenantModule/TenantMiddleware do pdv-web.
// Importa PersonModule: "meu perfil" mistura User (e-mail/senha) e a Person isSelf (nome) — ver comentário
// em AuthRepository.updateProfile. MailModule não precisa import explícito (é @Global()).
@Module({
  imports: [PersonModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, LoginAttemptTracker, PasswordResetService, TwoFactorService],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
