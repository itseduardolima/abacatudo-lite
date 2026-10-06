import { Injectable } from '@nestjs/common'
import type { Category as CategoryRow } from '@prisma/client'
import type { Category } from '@gastos/shared'
import { CategoryRepository } from './category.repository'

@Injectable()
export class CategoryService {
  constructor(private readonly repo: CategoryRepository) {}

  async list(userId: string, includeArchived: boolean): Promise<Category[]> {
    return (await this.repo.findMany(userId, includeArchived)).map(toDto)
  }
}

function toDto(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
