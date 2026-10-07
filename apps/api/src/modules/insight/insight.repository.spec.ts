import type { PrismaService } from '../../prisma/prisma.client'
import { InsightRepository } from './insight.repository'

describe('InsightRepository: compra cancelada fica fora dos relatórios', () => {
  it('gastos e assinaturas filtram cancelledAt null', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const repo = new InsightRepository({ transaction: { findMany } } as unknown as PrismaService)

    await repo.findRows('user-1', '2026-10')
    await repo.findSubscriptionRows('user-1', new Date('2026-01-01T00:00:00.000Z'))

    expect(findMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1', cancelledAt: null })
    expect(findMany.mock.calls[1][0].where).toMatchObject({ userId: 'user-1', cancelledAt: null })
  })
})
