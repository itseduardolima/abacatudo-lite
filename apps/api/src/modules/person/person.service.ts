import { Injectable } from '@nestjs/common'
import type { Person as PersonRow } from '@prisma/client'
import type { CreatePersonInput, Person } from '@gastos/shared'
import { ForbiddenError, NotFoundError } from '../../common/errors/domain.error'
import { PersonRepository } from './person.repository'

@Injectable()
export class PersonService {
  constructor(private readonly repo: PersonRepository) {}

  async create(userId: string, input: CreatePersonInput): Promise<Person> {
    const row = await this.repo.create(userId, { name: input.name })
    return toDto(row)
  }

  async list(userId: string, includeArchived: boolean): Promise<Person[]> {
    const rows = await this.repo.findMany(userId, includeArchived)
    return rows.map(toDto)
  }

  async archive(userId: string, id: string): Promise<void> {
    const person = await this.repo.findById(userId, id)
    if (!person) throw new NotFoundError('PERSON_NOT_FOUND', 'Pessoa não encontrada.')
    if (person.isSelf) throw new ForbiddenError('CANNOT_ARCHIVE_SELF', 'Não é possível arquivar você mesmo.')

    const result = await this.repo.archive(userId, id)
    if (result.count === 0) throw new NotFoundError('PERSON_NOT_FOUND', 'Pessoa não encontrada.')
  }
}

function toDto(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    isSelf: row.isSelf,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
