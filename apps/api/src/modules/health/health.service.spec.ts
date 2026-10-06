import type { PrismaService } from '../../prisma/prisma.client'
import { HealthService } from './health.service'

function serviceWith(queryRaw: jest.Mock) {
  return new HealthService({ $queryRaw: queryRaw } as unknown as PrismaService)
}

describe('HealthService', () => {
  it('consulta o banco de verdade (SELECT 1)', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    await serviceWith(queryRaw).checkDatabase()
    expect(queryRaw).toHaveBeenCalledTimes(1)
  })

  it('propaga o erro quando o Postgres não responde (nunca finge que está ok)', async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error('connection refused'))
    await expect(serviceWith(queryRaw).checkDatabase()).rejects.toThrow('connection refused')
  })
})
