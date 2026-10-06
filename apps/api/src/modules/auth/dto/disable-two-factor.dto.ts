import { disableTwoFactorInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class DisableTwoFactorDto extends createZodDto(disableTwoFactorInputSchema) {}
