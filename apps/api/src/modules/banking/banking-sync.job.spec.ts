import { BankingSyncJob } from './banking-sync.job'

function build(userIds: string[], lockAvailable = true) {
  const banking = {
    syncAllConnected: jest.fn(async (userId: string) => {
      if (userId === 'boom') throw new Error('x')
      return { synced: 1, failed: 0 }
    }),
  }
  const repository = {
    withAdvisoryLock: jest.fn(async (_key: number, fn: () => Promise<void>) => {
      if (!lockAvailable) return false
      await fn()
      return true
    }),
  }
  const auth = { findAllUserIds: jest.fn(async () => userIds) }
  const job = new BankingSyncJob(banking as never, repository as never, auth as never)
  return { job, banking, repository, auth }
}

describe('BankingSyncJob', () => {
  it('sincroniza cada usuário, um por vez', async () => {
    const { job, banking } = build(['user-a', 'user-b'])
    await job.runDaily()
    expect(banking.syncAllConnected).toHaveBeenCalledWith('user-a')
    expect(banking.syncAllConnected).toHaveBeenCalledWith('user-b')
  })

  it('falha de um usuário não interrompe os demais', async () => {
    const { job, banking } = build(['boom', 'user-b'])
    await job.runDaily()
    expect(banking.syncAllConnected).toHaveBeenCalledWith('user-b')
  })

  it('não roda quando outra instância já tem o lock', async () => {
    const { job, banking, auth } = build(['user-a'], false)
    await job.runDaily()
    expect(auth.findAllUserIds).not.toHaveBeenCalled()
    expect(banking.syncAllConnected).not.toHaveBeenCalled()
  })
})
