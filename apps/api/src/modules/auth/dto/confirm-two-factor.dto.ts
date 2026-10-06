import { confirmTwoFactorInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class ConfirmTwoFactorDto extends createZodDto(confirmTwoFactorInputSchema) {}
