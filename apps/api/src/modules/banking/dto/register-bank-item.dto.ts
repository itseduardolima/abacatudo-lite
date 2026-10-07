import { registerBankItemInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class RegisterBankItemDto extends createZodDto(registerBankItemInputSchema) {}
