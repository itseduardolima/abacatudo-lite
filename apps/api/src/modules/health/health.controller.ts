import { Controller, Get, Header } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import type { Health } from '@gastos/shared'
import { Public } from '../../common/decorators/public.decorator'
import { HealthService } from './health.service'

// Público e sem sessão: usado pelo monitor de uptime externo e pelo deploy (09-operacao § 1).
// Não expõe versão nem detalhe interno.
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiExcludeEndpoint()
  async check(): Promise<Health> {
    await this.health.checkDatabase()
    return { status: 'ok' }
  }
}
