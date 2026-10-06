import { categorySchema } from './category'

describe('categorySchema', () => {
  it('aceita uma categoria válida', () => {
    const result = categorySchema.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Mercado',
      archivedAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita campo extra (mass assignment)', () => {
    const result = categorySchema.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Mercado',
      archivedAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      userId: 'outro',
    })
    expect(result.success).toBe(false)
  })
})
