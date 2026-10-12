import type { Person as PersonRow } from '@prisma/client'
import { ForbiddenError, NotFoundError } from '../../common/errors/domain.error'
import type { PersonRepository } from './person.repository'
import { PersonService } from './person.service'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    archive: jest.fn(),
    rename: jest.fn(),
  } as unknown as jest.Mocked<PersonRepository>
}

function row(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'person-1',
    userId: 'user-1',
    name: 'Mãe',
    isSelf: false,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('PersonService', () => {
  it('create: nunca deixa o cliente setar isSelf (a Repository sempre cria com isSelf false)', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new PersonService(repo)

    await service.create('user-1', { name: 'Mãe' })

    expect(repo.create).toHaveBeenCalledWith('user-1', { name: 'Mãe' })
  })

  it('archive: recusa arquivar a Person self', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row({ isSelf: true }))
    const service = new PersonService(repo)

    await expect(service.archive('user-1', 'person-1')).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.archive).not.toHaveBeenCalled()
  })

  it('archive: 404 quando a pessoa não existe (ou não é do usuário)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(null)
    const service = new PersonService(repo)

    await expect(service.archive('user-1', 'inexistente')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('archive: funciona para uma pessoa não-self', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row())
    repo.archive.mockResolvedValue({ count: 1 })
    const service = new PersonService(repo)

    await expect(service.archive('user-1', 'person-1')).resolves.toBeUndefined()
    expect(repo.archive).toHaveBeenCalledWith('user-1', 'person-1')
  })

  it('rename: troca o nome e devolve a pessoa atualizada, sempre com o userId de quem pediu', async () => {
    const repo = repoMock()
    repo.rename.mockResolvedValue({ count: 1 })
    repo.findById.mockResolvedValue(row({ name: 'Mamãe' }))
    const service = new PersonService(repo)

    const result = await service.rename('user-1', 'person-1', { name: 'Mamãe' })

    expect(repo.rename).toHaveBeenCalledWith('user-1', 'person-1', 'Mamãe')
    expect(result).toMatchObject({ id: 'person-1', name: 'Mamãe' })
  })

  it('rename: pessoa de outro usuário (ou arquivada) dá 404 e nada é lido', async () => {
    const repo = repoMock()
    repo.rename.mockResolvedValue({ count: 0 })
    const service = new PersonService(repo)

    await expect(service.rename('user-2', 'person-1', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError)
    expect(repo.rename).toHaveBeenCalledWith('user-2', 'person-1', 'X')
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('rename: a pessoa self também pode ter o nome trocado, é só um rótulo', async () => {
    const repo = repoMock()
    repo.rename.mockResolvedValue({ count: 1 })
    repo.findById.mockResolvedValue(row({ isSelf: true, name: 'Edu' }))
    const service = new PersonService(repo)

    await expect(service.rename('user-1', 'person-1', { name: 'Edu' })).resolves.toMatchObject({ isSelf: true })
  })
})
