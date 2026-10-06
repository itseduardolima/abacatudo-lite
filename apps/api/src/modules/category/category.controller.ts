import { Controller, Get, Query } from '@nestjs/common'
import type { Category } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CategoryService } from './category.service'

// Lista fixa (seed, 03-regras-negocio § Categorias e regras) — sem criar/renomear/arquivar pelo cliente.
@Controller('categories')
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('includeArchived') includeArchived?: string): Promise<Category[]> {
    return this.categories.list(userId, includeArchived === 'true')
  }
}
