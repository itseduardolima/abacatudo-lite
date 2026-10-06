import { forgotPasswordInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class ForgotPasswordDto extends createZodDto(forgotPasswordInputSchema) {}
