import { updateTransactionDisplayNameInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateTransactionDisplayNameDto extends createZodDto(updateTransactionDisplayNameInputSchema) {}
