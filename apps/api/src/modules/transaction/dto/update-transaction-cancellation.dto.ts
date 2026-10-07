import { updateTransactionCancellationInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateTransactionCancellationDto extends createZodDto(updateTransactionCancellationInputSchema) {}
