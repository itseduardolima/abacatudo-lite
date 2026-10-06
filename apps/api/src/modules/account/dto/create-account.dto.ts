import { createAccountInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class CreateAccountDto extends createZodDto(createAccountInputSchema) {}
