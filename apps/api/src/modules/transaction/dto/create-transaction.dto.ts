import { createTransactionInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class CreateTransactionDto extends createZodDto(createTransactionInputSchema) {}
