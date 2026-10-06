import { updateBudgetMonthInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateBudgetMonthDto extends createZodDto(updateBudgetMonthInputSchema) {}
