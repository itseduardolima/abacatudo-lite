import { Inject, Injectable } from '@nestjs/common'
import type { Category } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class CategoryRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string, includeArchived: boolean): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { name: 'asc' },
    })
  }

  findById(userId: string, id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { userId, id } })
  }

  // Pra atribuir (transação): categoria arquivada some das listas de escolha, então também não pode ser
  // um destino novo.
  findActiveById(userId: string, id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { userId, id, archivedAt: null } })
  }
}
