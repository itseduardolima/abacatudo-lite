import { updatePersonInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdatePersonDto extends createZodDto(updatePersonInputSchema) {}
