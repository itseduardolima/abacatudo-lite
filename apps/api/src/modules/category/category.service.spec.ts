import type { Category as CategoryRow } from '@prisma/client'
import { CategoryService } from './category.service'
import type { CategoryRepository } from './category.repository'

function repoMock() {
  return { findMany: jest.fn() } as unknown as jest.Mocked<CategoryRepository>
}

function row(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Mercado',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('CategoryService', () => {
  it('list: devolve o DTO sem userId', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new CategoryService(repo)

    await expect(service.list('user-1', false)).resolves.toEqual([
      { id: 'cat-1', name: 'Mercado', archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z' },
    ])
  })

  it('list: repassa o filtro de arquivadas', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new CategoryService(repo)

    await service.list('user-1', true)
    expect(repo.findMany).toHaveBeenCalledWith('user-1', true)
  })
})
