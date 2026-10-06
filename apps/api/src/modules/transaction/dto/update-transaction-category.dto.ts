import { updateTransactionCategoryInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateTransactionCategoryDto extends createZodDto(updateTransactionCategoryInputSchema) {}
