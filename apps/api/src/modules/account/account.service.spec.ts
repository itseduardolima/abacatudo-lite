import type { Account as AccountRow, PluggyItemStatus } from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountService } from './account.service'
import type { AccountRepository, AccountWithPluggyItem } from './account.repository'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setBenefitAccount: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
  } as unknown as jest.Mocked<AccountRepository>
}

function row(
  overrides: Partial<AccountRow> = {},
  pluggyItem: { lastSyncAt: Date | null; status: PluggyItemStatus } | null = null,
): AccountWithPluggyItem {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'MANUAL',
    closingDay: 20,
    dueDay: 27,
    creditLimitCents: 500000,
    balanceCents: null,
    isBenefitAccount: false,
    bankLogo: null,
    pluggyItemId: null,
    externalAccountId: null,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
    pluggyItem,
  }
}

describe('AccountService', () => {
  it('create: passa o userId explícito para a Repository e devolve o DTO sem userId', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.create('user-1', {
      name: 'Nubank',
      type: 'CREDIT_CARD',
      source: 'MANUAL',
      closingDay: 20,
      dueDay: 27,
      creditLimitCents: 500000,
    })

    expect(repo.create).toHaveBeenCalledWith('user-1', {
      name: 'Nubank',
      type: 'CREDIT_CARD',
      source: 'MANUAL',
      closingDay: 20,
      dueDay: 27,
      creditLimitCents: 500000,
    })
    expect(result).not.toHaveProperty('userId')
    expect(result.createdAt).toBe('2026-09-01T00:00:00.000Z')
  })

  it('create: campos de cartão ausentes viram null, nunca undefined', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row({ type: 'CHECKING', closingDay: null, dueDay: null, creditLimitCents: null }))
    const service = new AccountService(repo)

    await service.create('user-1', { name: 'Conta corrente', type: 'CHECKING', source: 'MANUAL' })

    expect(repo.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ closingDay: null, dueDay: null, creditLimitCents: null }),
    )
  })

  it('list: por padrão não inclui arquivadas', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new AccountService(repo)

    const result = await service.list('user-1', false)

    expect(repo.findMany).toHaveBeenCalledWith('user-1', false)
    expect(result).toHaveLength(1)
  })

  it('getById: 404 quando a conta não existe (ou não é do usuário)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(null)
    const service = new AccountService(repo)

    await expect(service.getById('user-1', 'acc-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('getById: devolve a conta encontrada', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row())
    const service = new AccountService(repo)

    await expect(service.getById('user-1', 'acc-1')).resolves.toMatchObject({ id: 'acc-1', name: 'Nubank' })
  })

  it('lastSyncAt vem do PluggyItem por trás da conta (8.6)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(
      row(
        { source: 'PLUGGY', pluggyItemId: 'item-1' },
        { lastSyncAt: new Date('2026-09-22T10:00:00.000Z'), status: 'UPDATED' },
      ),
    )
    const service = new AccountService(repo)

    const result = await service.getById('user-1', 'acc-1')

    expect(result.lastSyncAt).toBe('2026-09-22T10:00:00.000Z')
  })

  it('bankConnectionId vem do pluggyItemId da conta e é null pra conta manual', async () => {
    const repo = repoMock()
    repo.findById
      .mockResolvedValueOnce(row({ source: 'PLUGGY', pluggyItemId: 'item-1' }, { lastSyncAt: null, status: 'UPDATED' }))
      .mockResolvedValueOnce(row())
    const service = new AccountService(repo)

    expect((await service.getById('user-1', 'acc-1')).bankConnectionId).toBe('item-1')
    expect((await service.getById('user-1', 'acc-1')).bankConnectionId).toBeNull()
  })

  it('lastSyncAt é null pra conta manual (nunca sincroniza)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.getById('user-1', 'acc-1')

    expect(result.lastSyncAt).toBeNull()
  })

  it('create: uma conta recém-criada nunca tem PluggyItem, lastSyncAt é null', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.create('user-1', { name: 'Nubank', type: 'CREDIT_CARD', source: 'MANUAL' })

    expect(result.lastSyncAt).toBeNull()
  })

  it('disconnected é true quando o PluggyItem por trás foi desconectado (8.5)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(
      row({ source: 'PLUGGY', pluggyItemId: 'item-1' }, { lastSyncAt: null, status: 'DISCONNECTED' }),
    )
    const service = new AccountService(repo)

    const result = await service.getById('user-1', 'acc-1')

    expect(result.disconnected).toBe(true)
  })

  it('disconnected é false pra conta manual e pra conta com PluggyItem ainda conectado', async () => {
    const repo = repoMock()
    repo.findById
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce(row({ source: 'PLUGGY', pluggyItemId: 'item-1' }, { lastSyncAt: null, status: 'UPDATED' }))
    const service = new AccountService(repo)

    expect((await service.getById('user-1', 'acc-1')).disconnected).toBe(false)
    expect((await service.getById('user-1', 'acc-1')).disconnected).toBe(false)
  })

  it('create: uma conta recém-criada nunca é desconectada', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.create('user-1', { name: 'Nubank', type: 'CREDIT_CARD', source: 'MANUAL' })

    expect(result.disconnected).toBe(false)
  })

  describe('update — name', () => {
    it('renomeia só o nome, sem tocar nos outros campos', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row())
      const service = new AccountService(repo)

      await service.update('user-1', 'acc-1', { name: 'Cartão principal' })

      expect(repo.update).toHaveBeenCalledTimes(1)
      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { name: 'Cartão principal' })
      expect(repo.setBenefitAccount).not.toHaveBeenCalled()
    })

    it('conta de outro usuário: 404 e nada é gravado', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = new AccountService(repo)

      await expect(service.update('user-2', 'acc-do-user-1', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('update — isBenefitAccount', () => {
    it('404 quando a conta não existe (ou não é do usuário)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = new AccountService(repo)

      await expect(service.update('user-1', 'acc-1', { isBenefitAccount: true })).rejects.toBeInstanceOf(NotFoundError)
    })

    it('422 quando a conta não é CHECKING', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ type: 'CREDIT_CARD' }))
      const service = new AccountService(repo)

      await expect(service.update('user-1', 'acc-1', { isBenefitAccount: true })).rejects.toBeInstanceOf(DomainError)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('marcar: desmarca qualquer outra conta de benefício antes de marcar esta, num transaction só', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ type: 'CHECKING' }))
        .mockResolvedValueOnce(row({ type: 'CHECKING', isBenefitAccount: true, balanceCents: 15000 }))
      const service = new AccountService(repo)

      const result = await service.update('user-1', 'acc-1', { isBenefitAccount: true })

      expect(repo.setBenefitAccount).toHaveBeenCalledWith('user-1', 'acc-1')
      expect(repo.update).not.toHaveBeenCalled()
      expect(result.isBenefitAccount).toBe(true)
      expect(result.balanceCents).toBe(15000)
    })

    it('desmarcar: não mexe nas outras contas, nunca chama o método atômico de marcar', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ type: 'CHECKING', isBenefitAccount: true }))
        .mockResolvedValueOnce(row({ type: 'CHECKING', isBenefitAccount: false }))
      const service = new AccountService(repo)

      await service.update('user-1', 'acc-1', { isBenefitAccount: false })

      expect(repo.setBenefitAccount).not.toHaveBeenCalled()
      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { isBenefitAccount: false })
    })

    it('nunca marca conta de outro usuário (userId sempre explícito pro repo)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = new AccountService(repo)

      await expect(service.update('user-2', 'acc-de-outro-user', { isBenefitAccount: true })).rejects.toBeInstanceOf(
        NotFoundError,
      )
      expect(repo.findById).toHaveBeenCalledWith('user-2', 'acc-de-outro-user')
      expect(repo.setBenefitAccount).not.toHaveBeenCalled()
    })
  })

  describe('update — fechamento e vencimento', () => {
    it('grava só o que veio, em cartão de crédito', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ closingDay: 2, dueDay: 10 }))
      const service = new AccountService(repo)

      const result = await service.update('user-1', 'acc-1', { closingDay: 2, dueDay: 10 })

      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { closingDay: 2, dueDay: 10 })
      expect(result).toMatchObject({ closingDay: 2, dueDay: 10 })
    })

    it('conta que não é cartão de crédito é rejeitada, sem gravar nada', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row({ type: 'CHECKING' }))
      const service = new AccountService(repo)

      await expect(service.update('user-1', 'acc-1', { closingDay: 2 })).rejects.toMatchObject({
        code: 'NOT_A_CREDIT_CARD',
      })
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('conta de outro usuário é 404', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(null)
      const service = new AccountService(repo)

      await expect(service.update('user-2', 'acc-1', { dueDay: 10 })).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('update — bankLogo', () => {
    it('grava o logo escolhido', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ bankLogo: 'nubank' }))
      const service = new AccountService(repo)

      const result = await service.update('user-1', 'acc-1', { bankLogo: 'nubank' })

      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { bankLogo: 'nubank' })
      expect(result.bankLogo).toBe('nubank')
    })

    it('null remove o logo (volta pro monograma)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row({ bankLogo: 'nubank' })).mockResolvedValueOnce(row({ bankLogo: null }))
      const service = new AccountService(repo)

      await service.update('user-1', 'acc-1', { bankLogo: null })

      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { bankLogo: null })
    })

    it('sem bankLogo no input, não mexe no campo', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(row())
      const service = new AccountService(repo)

      await service.update('user-1', 'acc-1', { isBenefitAccount: false })

      expect(repo.update).not.toHaveBeenCalledWith(
        'user-1',
        'acc-1',
        expect.objectContaining({ bankLogo: expect.anything() }),
      )
    })
  })

  describe('archive', () => {
    it('404 quando não existe (ou é de outro usuário)', async () => {
      const repo = repoMock()
      repo.archive.mockResolvedValue({ count: 0 })
      const service = new AccountService(repo)

      await expect(service.archive('user-1', 'acc-1')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('sucesso não lança', async () => {
      const repo = repoMock()
      repo.archive.mockResolvedValue({ count: 1 })
      const service = new AccountService(repo)

      await expect(service.archive('user-1', 'acc-1')).resolves.toBeUndefined()
    })
  })

  describe('restore', () => {
    it('devolve a conta removida pro usuário dono', async () => {
      const repo = repoMock()
      repo.restore.mockResolvedValue({ count: 1 })
      const service = new AccountService(repo)

      await expect(service.restore('user-1', 'acc-1')).resolves.toBeUndefined()
      expect(repo.restore).toHaveBeenCalledWith('user-1', 'acc-1')
    })

    it('404 pra conta de outro usuário ou que não está removida, sem tocar em nada', async () => {
      const repo = repoMock()
      repo.restore.mockResolvedValue({ count: 0 })
      const service = new AccountService(repo)

      await expect(service.restore('user-2', 'acc-do-user-1')).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.restore).toHaveBeenCalledWith('user-2', 'acc-do-user-1')
    })
  })
})
