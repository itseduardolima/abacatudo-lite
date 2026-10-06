import { updateTransactionPersonInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateTransactionPersonDto extends createZodDto(updateTransactionPersonInputSchema) {}
