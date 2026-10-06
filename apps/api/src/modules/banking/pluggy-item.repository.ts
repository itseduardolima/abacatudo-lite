import { Inject, Injectable } from '@nestjs/common'
import type { Prisma, PluggyItem } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class PluggyItemRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.PluggyItemUncheckedCreateInput, 'userId'>): Promise<PluggyItem> {
    return this.prisma.pluggyItem.create({ data: { ...data, userId } })
  }

  findMany(userId: string): Promise<PluggyItem[]> {
    return this.prisma.pluggyItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  }

  findConnected(userId: string): Promise<PluggyItem[]> {
    return this.prisma.pluggyItem.findMany({
      where: { userId, status: { not: 'DISCONNECTED' } },
      orderBy: { createdAt: 'asc' },
    })
  }

  findById(userId: string, id: string): Promise<PluggyItem | null> {
    return this.prisma.pluggyItem.findFirst({ where: { userId, id } })
  }

  async update(userId: string, id: string, data: Prisma.PluggyItemUpdateInput): Promise<void> {
    await this.prisma.pluggyItem.updateMany({ where: { userId, id }, data })
  }
}
