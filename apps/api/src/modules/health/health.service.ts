import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

// SELECT 1 de verdade: nunca um health check que só confirma "o processo Node está de pé" (09-operacao § 1).
// Postgres fora do ar => a promise rejeita e o filtro devolve 500 INTERNAL_ERROR.
@Injectable()
export class HealthService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`
  }
}
