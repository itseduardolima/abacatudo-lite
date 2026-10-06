import { previewSplitInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class PreviewSplitDto extends createZodDto(previewSplitInputSchema) {}
