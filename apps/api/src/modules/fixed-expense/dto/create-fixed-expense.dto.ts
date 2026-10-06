import { createFixedExpenseInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class CreateFixedExpenseDto extends createZodDto(createFixedExpenseInputSchema) {}
