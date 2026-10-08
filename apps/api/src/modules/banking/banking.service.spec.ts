import type {
  Account as AccountRow,
  CardHolderHint,
  Person as PersonRow,
  PluggyItem as PluggyItemRow,
  Rule,
} from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository } from '../account/account.repository'
import type { CardHolderHintRepository } from '../card-holder-hint/card-holder-hint.repository'
import type { PersonRepository } from '../person/person.repository'
import type { RuleRepository } from '../rule/rule.repository'
import type { BankingSyncRepository } from './banking-sync.repository'
import { BankingService } from './banking.service'
import type { PluggyClient } from './pluggy/pluggy.client'
import type { PluggyItemRepository } from './pluggy-item.repository'

function pluggyMock() {
  return {
    createConnectToken: jest.fn(),
    getItem: jest.fn(),
    refreshItem: jest
      .fn()
      .mockResolvedValue({ id: 'pluggy-item-1', status: 'UPDATED', connector: { id: 200, name: 'MeuPluggy' } }),
    listAccounts: jest.fn(),
    listTransactions: jest.fn(),
    deleteItem: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PluggyClient>
}

function itemsMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findConnected: jest.fn(),
    findById: jest.fn(),
    findByPluggyItemId: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<PluggyItemRepository>
}

function accountsMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    upsertFromSync: jest.fn(),
  } as unknown as jest.Mocked<AccountRepository>
}

function syncMock() {
  return {
    upsertTransaction: jest.fn(),
    mergeSettledPending: jest.fn(),
    mergeOrphanPending: jest.fn(),
  } as unknown as jest.Mocked<BankingSyncRepository>
}

// findSelf resolve pra "self-1" por padrão — a maioria dos testes não olha pra atribuição de pessoa.
function peopleMock() {
  const mock = { findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
  mock.findSelf.mockResolvedValue(personRow())
  return mock
}

function rulesMock() {
  const mock = { findMany: jest.fn() } as unknown as jest.Mocked<RuleRepository>
  mock.findMany.mockResolvedValue([])
  return mock
}

function cardHolderHintsMock() {
  const mock = { findMany: jest.fn(), upsertPerson: jest.fn() } as unknown as jest.Mocked<CardHolderHintRepository>
  mock.findMany.mockResolvedValue([])
  return mock
}

function newService(
  overrides: {
    pluggy?: jest.Mocked<PluggyClient>
    items?: jest.Mocked<PluggyItemRepository>
    accounts?: jest.Mocked<AccountRepository>
    sync?: jest.Mocked<BankingSyncRepository>
    people?: jest.Mocked<PersonRepository>
    rules?: jest.Mocked<RuleRepository>
    cardHolderHints?: jest.Mocked<CardHolderHintRepository>
  } = {},
) {
  return new BankingService(
    overrides.pluggy ?? pluggyMock(),
    overrides.items ?? itemsMock(),
    overrides.accounts ?? accountsMock(),
    overrides.sync ?? syncMock(),
    overrides.people ?? peopleMock(),
    overrides.rules ?? rulesMock(),
    overrides.cardHolderHints ?? cardHolderHintsMock(),
  )
}

const REMOTE_ITEM = {
  id: 'pluggy-item-1',
  status: 'UPDATING' as const,
  connector: { id: 200, name: 'MeuPluggy' },
}

function itemRow(overrides: Partial<PluggyItemRow> = {}): PluggyItemRow {
  return {
    id: 'item-1',
    userId: 'user-1',
    pluggyItemId: 'pluggy-item-1',
    institutionName: 'Meu Pluggy',
    status: 'WAITING_USER_INPUT',
    lastErrorCode: null,
    consentExpiresAt: null,
    lastSyncAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'PLUGGY',
    closingDay: 20,
    dueDay: 27,
    creditLimitCents: 500000,
    bankLogo: null,
    pluggyItemId: 'item-1',
    externalAccountId: 'ext-acc-1',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function personRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'self-1',
    userId: 'user-1',
    name: 'Eu',
    isSelf: true,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function ruleRow(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    userId: 'user-1',
    merchant: 'loja da família',
    personId: 'person-2',
    categoryId: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function cardHolderHintRow(overrides: Partial<CardHolderHint> = {}): CardHolderHint {
  return {
    id: 'hint-1',
    userId: 'user-1',
    accountId: 'acc-1',
    cardLast4: '1234',
    personId: 'person-3',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('BankingService', () => {
  it('connect: devolve o connectToken do widget e não cria nenhum item (plano gratuito só cria pelo widget)', async () => {
    const pluggy = pluggyMock()
    pluggy.createConnectToken.mockResolvedValue('connect-jwt')
    const items = itemsMock()
    const service = newService({ pluggy, items })

    const result = await service.connect()

    expect(result).toEqual({ connectToken: 'connect-jwt' })
    expect(items.create).not.toHaveBeenCalled()
  })

  it('register: confere o Item no Pluggy e cria a conexão local aguardando o primeiro status', async () => {
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue(REMOTE_ITEM)
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(null)
    items.create.mockResolvedValue(itemRow())
    const service = newService({ pluggy, items })

    const result = await service.register('user-1', { pluggyItemId: 'pluggy-item-1' })

    expect(pluggy.getItem).toHaveBeenCalledWith('pluggy-item-1')
    expect(items.create).toHaveBeenCalledWith('user-1', {
      pluggyItemId: 'pluggy-item-1',
      institutionName: 'Meu Pluggy',
      status: 'WAITING_USER_INPUT',
    })
    expect(result).toEqual({ id: 'item-1' })
  })

  it('register: Item que não existe na nossa conta Pluggy não vira conexão', async () => {
    const pluggy = pluggyMock()
    pluggy.getItem.mockRejectedValue(new Error('Pluggy 404'))
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(null)
    const service = newService({ pluggy, items })

    await expect(service.register('user-1', { pluggyItemId: 'inventado' })).rejects.toThrow('Pluggy 404')

    expect(items.create).not.toHaveBeenCalled()
  })

  it('register: Item que já é do próprio usuário é idempotente (widget disparou onSuccess duas vezes)', async () => {
    const pluggy = pluggyMock()
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(itemRow({ id: 'item-9', userId: 'user-1' }))
    const service = newService({ pluggy, items })

    const result = await service.register('user-1', { pluggyItemId: 'pluggy-item-1' })

    expect(result).toEqual({ id: 'item-9' })
    expect(pluggy.getItem).not.toHaveBeenCalled()
    expect(items.create).not.toHaveBeenCalled()
  })

  it('register: Item que já é de outro usuário dá 404 e nada é criado', async () => {
    const pluggy = pluggyMock()
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(itemRow({ userId: 'user-2' }))
    const service = newService({ pluggy, items })

    await expect(service.register('user-1', { pluggyItemId: 'pluggy-item-1' })).rejects.toBeInstanceOf(NotFoundError)

    expect(items.create).not.toHaveBeenCalled()
  })

  it('register com replacesId: cria o Item novo e revoga o antigo', async () => {
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(null)
    items.findById.mockResolvedValue(
      itemRow({ id: 'item-1', pluggyItemId: 'pluggy-item-1', status: 'LOGIN_ERROR', institutionName: 'Banco X' }),
    )
    items.create.mockResolvedValue(itemRow({ id: 'item-2', pluggyItemId: 'pluggy-item-2' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({ ...REMOTE_ITEM, id: 'pluggy-item-2' })
    const service = newService({ items, pluggy })

    const result = await service.register('user-1', { pluggyItemId: 'pluggy-item-2', replacesId: 'item-1' })

    expect(items.create).toHaveBeenCalledWith('user-1', {
      pluggyItemId: 'pluggy-item-2',
      institutionName: 'Banco X',
      status: 'WAITING_USER_INPUT',
    })
    expect(pluggy.deleteItem).toHaveBeenCalledWith('pluggy-item-1')
    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', { status: 'DISCONNECTED' })
    expect(result).toEqual({ id: 'item-2' })
  })

  it('register com replacesId: item antigo já desconectado — não tenta revogar de novo no Pluggy', async () => {
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(null)
    items.findById.mockResolvedValue(itemRow({ id: 'item-1', status: 'DISCONNECTED' }))
    items.create.mockResolvedValue(itemRow({ id: 'item-2' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({ ...REMOTE_ITEM, id: 'pluggy-item-2' })
    const service = newService({ items, pluggy })

    await service.register('user-1', { pluggyItemId: 'pluggy-item-2', replacesId: 'item-1' })

    expect(pluggy.deleteItem).not.toHaveBeenCalled()
  })

  it('register com replacesId de outro usuário: 404 antes de criar qualquer coisa', async () => {
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(null)
    items.findById.mockResolvedValue(null)
    const pluggy = pluggyMock()
    const service = newService({ items, pluggy })

    await expect(
      service.register('user-1', { pluggyItemId: 'pluggy-item-2', replacesId: 'item-de-outro' }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(pluggy.getItem).not.toHaveBeenCalled()
    expect(items.create).not.toHaveBeenCalled()
  })

  it('register com replacesId: se revogar o antigo falhar, ainda devolve a nova conexão (melhor esforço, não bloqueia)', async () => {
    const items = itemsMock()
    items.findByPluggyItemId.mockResolvedValue(null)
    items.findById.mockResolvedValue(itemRow({ id: 'item-1', status: 'UPDATED' }))
    items.create.mockResolvedValue(itemRow({ id: 'item-2' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({ ...REMOTE_ITEM, id: 'pluggy-item-2' })
    pluggy.deleteItem.mockRejectedValue(new Error('Pluggy fora do ar'))
    const service = newService({ items, pluggy })

    const result = await service.register('user-1', { pluggyItemId: 'pluggy-item-2', replacesId: 'item-1' })

    expect(result).toEqual({ id: 'item-2' })
    expect(items.update).not.toHaveBeenCalled()
  })

  it('checkStatus: 404 quando a conexão não é do usuário', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(null)
    const service = newService({ items })

    await expect(service.checkStatus('user-1', 'item-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('checkStatus: status UPDATING é transiente, nunca persistido', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'UPDATING',
      connector: { id: 200, name: 'Meu Pluggy' },
    })
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).not.toHaveBeenCalled()
  })

  it('checkStatus: primeira vez que vira UPDATED dispara a sincronização', async () => {
    const items = itemsMock()
    items.findById
      .mockResolvedValueOnce(itemRow({ status: 'WAITING_USER_INPUT' }))
      .mockResolvedValueOnce(itemRow({ status: 'WAITING_USER_INPUT' }))
      .mockResolvedValueOnce(itemRow({ status: 'UPDATED' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'UPDATED',
      connector: { id: 200, name: 'Meu Pluggy' },
    })
    pluggy.listAccounts.mockResolvedValue([])
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', {
      status: 'UPDATED',
      consentExpiresAt: null,
      lastErrorCode: null,
    })
    expect(pluggy.listAccounts).toHaveBeenCalledWith('pluggy-item-1')
  })

  it('checkStatus: LOGIN_ERROR persiste o código do erro, pra não deixar o usuário sem saber o motivo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'LOGIN_ERROR',
      connector: { id: 200, name: 'Meu Pluggy' },
      error: { code: 'INVALID_CREDENTIALS' },
    })
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', {
      status: 'LOGIN_ERROR',
      consentExpiresAt: null,
      lastErrorCode: 'INVALID_CREDENTIALS',
    })
  })

  it('checkStatus: já estava UPDATED antes, não sincroniza de novo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ status: 'UPDATED' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'UPDATED',
      connector: { id: 200, name: 'Meu Pluggy' },
    })
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(pluggy.listAccounts).not.toHaveBeenCalled()
  })

  it('syncAllConnected: sincroniza só os itens conectados e uma falha não derruba os outros', async () => {
    const items = itemsMock()
    items.findConnected.mockResolvedValue([itemRow({ id: 'item-1' }), itemRow({ id: 'item-2' })])
    items.findById.mockImplementation(async (_userId, id) => itemRow({ id }))
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockRejectedValueOnce(new Error('pluggy down')).mockResolvedValueOnce([])

    const result = await newService({ items, accounts, pluggy }).syncAllConnected('user-1')

    expect(items.findConnected).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ synced: 1, failed: 1 })
  })

  it('manualSync: recusa com 429 se o último sync foi há menos de 15 min, e libera depois', async () => {
    const items = itemsMock()
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([])
    const service = newService({ items, pluggy })

    items.findById.mockResolvedValue(itemRow({ lastSyncAt: new Date(Date.now() - 5 * 60 * 1000) }))
    await expect(service.manualSync('user-1', 'item-1')).rejects.toMatchObject({
      code: 'SYNC_TOO_RECENT',
      statusCode: 429,
    })
    expect(pluggy.listAccounts).not.toHaveBeenCalled()

    items.findById.mockResolvedValue(itemRow({ lastSyncAt: new Date(Date.now() - 16 * 60 * 1000) }))
    await expect(service.manualSync('user-1', 'item-1')).resolves.toEqual({ accountsSynced: 0, transactionsSynced: 0 })
  })

  describe('manualSync: atualização do item direto no banco', () => {
    const remote = (status: 'UPDATING' | 'UPDATED' | 'LOGIN_ERROR') => ({
      id: 'pluggy-item-1',
      status,
      connector: { id: 200, name: 'MeuPluggy' },
      error: status === 'LOGIN_ERROR' ? { code: 'INVALID_CREDENTIALS' } : null,
    })

    function setup() {
      const items = itemsMock()
      items.findById.mockResolvedValue(itemRow())
      const pluggy = pluggyMock()
      pluggy.listAccounts.mockResolvedValue([])
      return { items, pluggy }
    }

    it('pede ao Pluggy para atualizar o item antes de ler as contas', async () => {
      const { items, pluggy } = setup()
      pluggy.refreshItem.mockResolvedValue(remote('UPDATED'))

      await newService({ items, pluggy }).manualSync('user-1', 'item-1')

      expect(pluggy.refreshItem).toHaveBeenCalledWith('pluggy-item-1')
      expect(pluggy.refreshItem.mock.invocationCallOrder[0]).toBeLessThan(
        pluggy.listAccounts.mock.invocationCallOrder[0]!,
      )
    })

    it('espera o Pluggy terminar de atualizar (UPDATING até UPDATED) antes de ler', async () => {
      jest.useFakeTimers()
      try {
        const { items, pluggy } = setup()
        pluggy.refreshItem.mockResolvedValue(remote('UPDATING'))
        pluggy.getItem.mockResolvedValueOnce(remote('UPDATING')).mockResolvedValueOnce(remote('UPDATED'))

        const promise = newService({ items, pluggy }).manualSync('user-1', 'item-1')
        await jest.advanceTimersByTimeAsync(10_000)
        await promise

        expect(pluggy.getItem).toHaveBeenCalledTimes(2)
        expect(pluggy.listAccounts).toHaveBeenCalledTimes(1)
      } finally {
        jest.useRealTimers()
      }
    })

    it('se o Pluggy recusar a atualização, o sync segue com o que ele já guardou', async () => {
      const { items, pluggy } = setup()
      pluggy.refreshItem.mockRejectedValue(new Error('HTTP 400'))

      await expect(newService({ items, pluggy }).manualSync('user-1', 'item-1')).resolves.toEqual({
        accountsSynced: 0,
        transactionsSynced: 0,
      })
      expect(pluggy.listAccounts).toHaveBeenCalledTimes(1)
    })

    it('erro de login no banco é gravado no item e o sync continua com os dados guardados', async () => {
      const { items, pluggy } = setup()
      pluggy.refreshItem.mockResolvedValue(remote('LOGIN_ERROR'))

      await newService({ items, pluggy }).manualSync('user-1', 'item-1')

      expect(items.update).toHaveBeenCalledWith(
        'user-1',
        'item-1',
        expect.objectContaining({ status: 'LOGIN_ERROR', lastErrorCode: 'INVALID_CREDENTIALS' }),
      )
      expect(pluggy.listAccounts).toHaveBeenCalledTimes(1)
    })

    it('a primeira sincronização depois do widget não pede atualização (o item acabou de ser criado)', async () => {
      const { items, pluggy } = setup()
      items.findById.mockResolvedValue(itemRow({ status: 'WAITING_USER_INPUT' }))
      pluggy.getItem.mockResolvedValue(remote('UPDATED'))

      await newService({ items, pluggy }).checkStatus('user-1', 'item-1')

      expect(pluggy.refreshItem).not.toHaveBeenCalled()
    })
  })

  it('manualSync: o update do upsert nunca leva o nome — renomear a conta não é desfeito pelo sync', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({ results: [], next: null })

    await newService({ items, accounts, pluggy }).manualSync('user-1', 'item-1')

    const createData = accounts.upsertFromSync.mock.calls[0]?.[2]
    const updateData = accounts.upsertFromSync.mock.calls[0]?.[3]
    expect(createData).toMatchObject({ name: 'Nubank' })
    expect(updateData).not.toHaveProperty('name')
  })

  it('manualSync: fechamento e vencimento que o Pluggy não manda (null) não apagam o que foi informado à mão', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Pic Pay', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({ results: [], next: null })

    await newService({ items, accounts, pluggy }).manualSync('user-1', 'item-1')

    const updateData = accounts.upsertFromSync.mock.calls[0]?.[3]
    expect(updateData).not.toHaveProperty('closingDay')
    expect(updateData).not.toHaveProperty('dueDay')
    expect(updateData).not.toHaveProperty('creditLimitCents')
  })

  it('manualSync: não grava a pendente que o Pluggy repete junto da lançada e entrega o par pra mesclar', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    const payment = (id: string, status: 'PENDING' | 'POSTED', date: string, billId: string | null) => ({
      id,
      amount: 546.46,
      type: 'CREDIT' as const,
      operationType: 'PAGAMENTO_FATURA',
      category: null,
      categoryId: null,
      status,
      date,
      description: 'Pagamento recebido',
      merchant: null,
      creditCardMetadata: billId ? { billId } : null,
    })
    pluggy.listTransactions.mockResolvedValueOnce({
      results: [
        payment('pending-1', 'PENDING', '2026-09-30T18:33:06.490Z', null),
        payment('posted-1', 'POSTED', '2026-09-30T03:00:00.000Z', 'bill-1'),
      ],
      next: null,
    })
    const sync = syncMock()

    await newService({ pluggy, items, accounts, sync }).manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledTimes(1)
    expect(sync.upsertTransaction).toHaveBeenCalledWith(
      'user-1',
      'acc-1',
      'self-1',
      null,
      expect.objectContaining({ externalId: 'posted-1' }),
    )
    expect(sync.mergeSettledPending).toHaveBeenCalledWith('user-1', 'acc-1', [
      { pendingId: 'pending-1', postedId: 'posted-1' },
    ])
  })

  it('manualSync: pede a limpeza das pendentes órfãs com tudo o que o Pluggy devolveu e não falha se a limpeza falhar', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValueOnce({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*LOJA',
          merchant: null,
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    sync.mergeOrphanPending.mockRejectedValue(new Error('boom'))

    const result = await newService({ pluggy, items, accounts, sync }).manualSync('user-1', 'item-1')

    expect(sync.mergeOrphanPending).toHaveBeenCalledWith('user-1', 'acc-1', ['tx-1'])
    expect(result).toMatchObject({ accountsSynced: 1, transactionsSynced: 1 })
  })

  it('manualSync: sincroniza conta e transações por upsert atômico, sem duplicar', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions
      .mockResolvedValueOnce({
        results: [
          {
            id: 'tx-1',
            amount: 50,
            type: 'DEBIT',
            operationType: null,
            category: null,
            categoryId: null,
            status: 'POSTED',
            date: '2026-09-21',
            description: 'PAG*LOJA',
            merchant: null,
            creditCardMetadata: null,
          },
        ],
        next: 'https://api.pluggy.ai/v2/transactions?cursor=abc',
      })
      .mockResolvedValueOnce({ results: [], next: null })
    const sync = syncMock()
    const service = newService({ pluggy, items, accounts, sync })

    const result = await service.manualSync('user-1', 'item-1')

    expect(accounts.upsertFromSync).toHaveBeenCalledWith(
      'user-1',
      'ext-acc-1',
      expect.objectContaining({ name: 'Nubank', source: 'PLUGGY' }),
      expect.any(Object),
    )
    expect(sync.upsertTransaction).toHaveBeenCalledTimes(1)
    expect(sync.upsertTransaction).toHaveBeenCalledWith(
      'user-1',
      'acc-1',
      'self-1',
      null,
      expect.objectContaining({ externalId: 'tx-1' }),
    )
    expect(pluggy.listTransactions).toHaveBeenNthCalledWith(
      2,
      'ext-acc-1',
      'https://api.pluggy.ai/v2/transactions?cursor=abc',
    )
    expect(result).toEqual({ accountsSynced: 1, transactionsSynced: 1 })
  })

  it('manualSync: pluggyItemId também vai no update do upsert — sem isso, uma conta reaproveitada por outro Item (reconectar, 8.4) fica presa apontando pro Item antigo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ id: 'item-2' }))
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({ results: [], next: null })
    const service = newService({ pluggy, items, accounts })

    await service.manualSync('user-1', 'item-2')

    expect(accounts.upsertFromSync).toHaveBeenCalledWith(
      'user-1',
      'ext-acc-1',
      expect.any(Object),
      expect.objectContaining({ pluggyItemId: 'item-2' }),
    )
  })

  it('manualSync: só conta de cartão de crédito é sincronizada, conta BANK é ignorada', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValueOnce(accountRow({ id: 'acc-1', externalAccountId: 'ext-acc-1' }))
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([
      { id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank cartão', creditData: null },
      { id: 'ext-acc-2', type: 'BANK', name: 'Nubank conta', creditData: null },
    ])
    pluggy.listTransactions.mockResolvedValue({ results: [], next: null })
    const service = newService({ pluggy, items, accounts })

    const result = await service.manualSync('user-1', 'item-1')

    expect(accounts.upsertFromSync).toHaveBeenCalledTimes(1)
    expect(accounts.upsertFromSync).toHaveBeenCalledWith(
      'user-1',
      'ext-acc-1',
      expect.objectContaining({ type: 'CREDIT_CARD' }),
      expect.any(Object),
    )
    expect(pluggy.listTransactions).toHaveBeenCalledTimes(1)
    expect(result.accountsSynced).toBe(1)
  })

  it('manualSync: sem regra, a transação nasce "Meu" (personId do self)', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*MERCADO',
          merchant: { businessName: 'Mercado Livre' },
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const people = peopleMock()
    people.findSelf.mockResolvedValue(personRow({ id: 'self-42' }))
    const rules = rulesMock()
    const service = newService({ pluggy, items, accounts, sync, people, rules })

    await service.manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledWith('user-1', 'acc-1', 'self-42', null, expect.any(Object))
  })

  it('manualSync: com Rule pro estabelecimento (normalizado), atribui a pessoa e a categoria da regra', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*LOJA DA FAMILIA',
          merchant: { businessName: '  Loja da Família  ' },
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const rules = rulesMock()
    rules.findMany.mockResolvedValue([
      ruleRow({ merchant: 'loja da família', personId: 'person-2', categoryId: 'cat-mercado' }),
    ])
    const service = newService({ pluggy, items, accounts, sync, rules })

    await service.manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledWith(
      'user-1',
      'acc-1',
      'person-2',
      'cat-mercado',
      expect.any(Object),
    )
  })

  it('manualSync: CardHolderHint (cartão adicional, 2.3) decide antes da Rule de estabelecimento', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow({ id: 'acc-1' }))
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*LOJA DA FAMILIA',
          merchant: { businessName: 'Loja da Família' },
          creditCardMetadata: { cardNumber: '1234', totalInstallments: null, installmentNumber: null, billId: null },
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const rules = rulesMock()
    rules.findMany.mockResolvedValue([ruleRow({ merchant: 'loja da família', personId: 'person-2' })])
    const cardHolderHints = cardHolderHintsMock()
    cardHolderHints.findMany.mockResolvedValue([
      cardHolderHintRow({ accountId: 'acc-1', cardLast4: '1234', personId: 'person-3' }),
    ])
    const service = newService({ pluggy, items, accounts, sync, rules, cardHolderHints })

    await service.manualSync('user-1', 'item-1')

    // person-3 (do hint), não person-2 (da Rule) — cartão adicional decide antes do estabelecimento.
    expect(sync.upsertTransaction).toHaveBeenCalledWith('user-1', 'acc-1', 'person-3', null, expect.any(Object))
  })

  it('manualSync: CardHolderHint é por conta — o mesmo final de cartão em outra conta não bate', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow({ id: 'acc-2' }))
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*LOJA',
          merchant: null,
          creditCardMetadata: { cardNumber: '1234', totalInstallments: null, installmentNumber: null, billId: null },
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const cardHolderHints = cardHolderHintsMock()
    // hint é da conta 'acc-1', mas a transação é da conta 'acc-2'.
    cardHolderHints.findMany.mockResolvedValue([cardHolderHintRow({ accountId: 'acc-1', cardLast4: '1234' })])
    const service = newService({ pluggy, items, accounts, sync, cardHolderHints })

    await service.manualSync('user-1', 'item-1')

    // cai no padrão "Meu" (self-1), não no hint de outra conta.
    expect(sync.upsertTransaction).toHaveBeenCalledWith('user-1', 'acc-2', 'self-1', null, expect.any(Object))
  })

  it('manualSync: Rule só de categoria (sem pessoa) deixa a pessoa cair no padrão "Meu"', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*MERCADO',
          merchant: { businessName: 'Mercado Central' },
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const people = peopleMock()
    people.findSelf.mockResolvedValue(personRow({ id: 'self-1' }))
    const rules = rulesMock()
    rules.findMany.mockResolvedValue([
      ruleRow({ merchant: 'mercado central', personId: null, categoryId: 'cat-mercado' }),
    ])
    const service = newService({ pluggy, items, accounts, sync, people, rules })

    await service.manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledWith('user-1', 'acc-1', 'self-1', 'cat-mercado', expect.any(Object))
  })

  it('manualSync: sem Pessoa self cadastrada, falha alto (invariante quebrada)', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const people = peopleMock()
    people.findSelf.mockResolvedValue(null)
    const service = newService({ items, people })

    await expect(service.manualSync('user-1', 'item-1')).rejects.toThrow('Pessoa "Eu" não encontrada.')
  })

  it('manualSync: item desconectado nunca sincroniza (erro claro, nunca "Pluggy indisponível")', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ status: 'DISCONNECTED' }))
    const pluggy = pluggyMock()
    const service = newService({ items, pluggy })

    await expect(service.manualSync('user-1', 'item-1')).rejects.toThrow('desconectada')
    expect(pluggy.listAccounts).not.toHaveBeenCalled()
  })

  it('checkStatus: item desconectado nunca chama o Pluggy de novo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ status: 'DISCONNECTED' }))
    const pluggy = pluggyMock()
    const service = newService({ items, pluggy })

    await expect(service.checkStatus('user-1', 'item-1')).rejects.toBeInstanceOf(DomainError)
    expect(pluggy.getItem).not.toHaveBeenCalled()
  })

  it('disconnect: 404 quando a conexão não é do usuário', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(null)
    const service = newService({ items })

    await expect(service.disconnect('user-1', 'item-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('disconnect: revoga o Item no Pluggy e marca o status localmente, sem apagar nada', async () => {
    const items = itemsMock()
    items.findById
      .mockResolvedValueOnce(itemRow({ status: 'UPDATED' }))
      .mockResolvedValueOnce(itemRow({ status: 'DISCONNECTED' }))
    const pluggy = pluggyMock()
    const service = newService({ items, pluggy })

    const result = await service.disconnect('user-1', 'item-1')

    expect(pluggy.deleteItem).toHaveBeenCalledWith('pluggy-item-1')
    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', { status: 'DISCONNECTED' })
    expect(result.status).toBe('DISCONNECTED')
  })

  it('disconnect: idempotente — item já desconectado não chama o Pluggy de novo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ status: 'DISCONNECTED' }))
    const pluggy = pluggyMock()
    const service = newService({ items, pluggy })

    await service.disconnect('user-1', 'item-1')

    expect(pluggy.deleteItem).not.toHaveBeenCalled()
    expect(items.update).not.toHaveBeenCalled()
  })

  it('disconnect: se a revogação no Pluggy falhar, nunca marca desconectado localmente (nunca mente sobre o estado)', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ status: 'UPDATED' }))
    const pluggy = pluggyMock()
    pluggy.deleteItem.mockRejectedValue(new Error('Pluggy fora do ar'))
    const service = newService({ items, pluggy })

    await expect(service.disconnect('user-1', 'item-1')).rejects.toThrow('Pluggy fora do ar')

    expect(items.update).not.toHaveBeenCalled()
  })

  it('reconnect: 404 quando a conexão não é do usuário, sem gerar token', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(null)
    const pluggy = pluggyMock()
    const service = newService({ items, pluggy })

    await expect(service.reconnect('user-1', 'item-de-outro')).rejects.toBeInstanceOf(NotFoundError)
    expect(pluggy.createConnectToken).not.toHaveBeenCalled()
  })

  it('reconnect: devolve um connectToken e não mexe em nada ainda (o antigo só é revogado no register)', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ id: 'item-1', status: 'LOGIN_ERROR' }))
    const pluggy = pluggyMock()
    pluggy.createConnectToken.mockResolvedValue('connect-jwt')
    const service = newService({ items, pluggy })

    const result = await service.reconnect('user-1', 'item-1')

    expect(result).toEqual({ connectToken: 'connect-jwt' })
    expect(items.create).not.toHaveBeenCalled()
    expect(pluggy.deleteItem).not.toHaveBeenCalled()
  })
})
