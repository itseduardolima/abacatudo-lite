import { Inject, Injectable } from '@nestjs/common'
import type { Person, Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class PersonRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.PersonUncheckedCreateInput, 'userId' | 'isSelf'>): Promise<Person> {
    return this.prisma.person.create({ data: { ...data, userId, isSelf: false } })
  }

  findMany(userId: string, includeArchived: boolean): Promise<Person[]> {
    return this.prisma.person.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: [{ isSelf: 'desc' }, { createdAt: 'asc' }],
    })
  }

  findById(userId: string, id: string): Promise<Person | null> {
    return this.prisma.person.findFirst({ where: { userId, id } })
  }

  // Pra atribuir (transação, split): pessoa arquivada some das listas de escolha, então também não pode
  // ser um destino novo (03-regras-negocio, "arquivar" § Pessoas).
  findActiveById(userId: string, id: string): Promise<Person | null> {
    return this.prisma.person.findFirst({ where: { userId, id, archivedAt: null } })
  }

  findSelf(userId: string): Promise<Person | null> {
    return this.prisma.person.findFirst({ where: { userId, isSelf: true } })
  }

  archive(userId: string, id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.person.updateMany({ where: { userId, id, isSelf: false }, data: { archivedAt: new Date() } })
  }
}
