import { loginInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class LoginDto extends createZodDto(loginInputSchema) {}
