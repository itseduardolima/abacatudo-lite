import { resetPasswordInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class ResetPasswordDto extends createZodDto(resetPasswordInputSchema) {}
