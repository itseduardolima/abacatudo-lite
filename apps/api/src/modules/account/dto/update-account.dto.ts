import { updateAccountInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateAccountDto extends createZodDto(updateAccountInputSchema) {}
