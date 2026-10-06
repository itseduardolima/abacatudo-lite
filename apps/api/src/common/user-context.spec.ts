import { currentUserId, getUserId, runAsUser } from './user-context'

describe('user-context', () => {
  it('getUserId falha quando não há usuário no contexto', () => {
    expect(() => getUserId()).toThrow('User not resolved')
    expect(currentUserId()).toBeUndefined()
  })

  it('runAsUser expõe o usuário só dentro do callback', async () => {
    const inside = await runAsUser('user-a', async () => getUserId())
    expect(inside).toBe('user-a')
    expect(currentUserId()).toBeUndefined()
  })

  it('mantém o usuário certo em execuções concorrentes (nunca vaza entre usuários)', async () => {
    const results = await Promise.all(
      ['user-a', 'user-b', 'user-c'].map((id, i) =>
        runAsUser(id, async () => {
          await new Promise((resolve) => setTimeout(resolve, 15 - i * 5))
          return getUserId()
        }),
      ),
    )
    expect(results).toEqual(['user-a', 'user-b', 'user-c'])
  })
})
