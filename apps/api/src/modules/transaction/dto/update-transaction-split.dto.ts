import { updateTransactionSplitInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateTransactionSplitDto extends createZodDto(updateTransactionSplitInputSchema) {}
