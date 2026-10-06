import { createPersonInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class CreatePersonDto extends createZodDto(createPersonInputSchema) {}
