import { changePasswordInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class ChangePasswordDto extends createZodDto(changePasswordInputSchema) {}
