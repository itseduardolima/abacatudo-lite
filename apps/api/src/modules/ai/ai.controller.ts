import { Controller, Post } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CategorySuggestionService, type SuggestCategoriesOutcome } from './category-suggestion.service'

@Controller('ai')
export class AiController {
  constructor(private readonly categorySuggestions: CategorySuggestionService) {}

  @Post('suggest-categories')
  suggestCategories(@CurrentUser() userId: string): Promise<SuggestCategoriesOutcome> {
    return this.categorySuggestions.suggestForUser(userId)
  }
}
