import { verifyTwoFactorInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class VerifyTwoFactorDto extends createZodDto(verifyTwoFactorInputSchema) {}
