import { updateFixedExpenseInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateFixedExpenseDto extends createZodDto(updateFixedExpenseInputSchema) {}
