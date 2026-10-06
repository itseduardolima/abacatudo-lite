import { updateProfileInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateProfileDto extends createZodDto(updateProfileInputSchema) {}
