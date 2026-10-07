import { Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { PluggyClient, PluggyNotConfiguredError, PluggyUnavailableError } from './pluggy.client'

function configMock(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    PLUGGY_CLIENT_ID: 'client-id',
    PLUGGY_CLIENT_SECRET: 'client-secret',
    ...overrides,
  }
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function fakeApiKeyJwt(expiresInSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).toString(
    'base64url',
  )
  return `header.${payload}.signature`
}

describe('PluggyClient', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => jest.restoreAllMocks())

  it('sem PLUGGY_CLIENT_ID/SECRET, recusa com PLUGGY_NOT_CONFIGURED e nunca chama fetch', async () => {
    const client = new PluggyClient(configMock({ PLUGGY_CLIENT_ID: undefined }))
    await expect(client.getItem('item-1')).rejects.toBeInstanceOf(PluggyNotConfiguredError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('createConnectToken: autentica, chama /connect_token e devolve o accessToken', async () => {
    const apiKey = fakeApiKeyJwt(3600)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'connect-jwt' }))
    const client = new PluggyClient(configMock())

    const result = await client.createConnectToken()

    expect(result).toBe('connect-jwt')
    const [authCall, tokenCall] = fetchMock.mock.calls as [[string, RequestInit], [string, RequestInit]]
    expect(authCall[0]).toBe('https://api.pluggy.ai/auth')
    expect(tokenCall[0]).toBe('https://api.pluggy.ai/connect_token')
    expect(tokenCall[1].method).toBe('POST')
    expect((tokenCall[1].headers as Record<string, string>)['x-api-key']).toBe(apiKey)
  })

  it('createConnectToken: 4xx do Pluggy vira PLUGGY_UNAVAILABLE e o motivo vai pro log, nunca pro cliente', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(400, { codeDescription: 'SOME_PLAN_LIMIT', message: 'segredo' }))
    const client = new PluggyClient(configMock())

    await expect(client.createConnectToken()).rejects.toBeInstanceOf(PluggyUnavailableError)

    expect(logSpy).toHaveBeenCalledWith('POST /connect_token: HTTP 400 (SOME_PLAN_LIMIT)')
  })

  it('reaproveita a API key enquanto ela não expira (uma chamada a /auth só)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'item-1', status: 'UPDATED', connector: { id: 200, name: 'MeuPluggy' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'item-1', status: 'UPDATED', connector: { id: 200, name: 'MeuPluggy' } }),
      )
    const client = new PluggyClient(configMock())

    await client.getItem('item-1')
    await client.getItem('item-1')

    const authCalls = fetchMock.mock.calls.filter((call) => call[0] === 'https://api.pluggy.ai/auth')
    expect(authCalls).toHaveLength(1)
  })

  it('pede uma nova API key quando a anterior já expirou', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(-10) }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'item-1', status: 'UPDATED', connector: { id: 200, name: 'MeuPluggy' } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'item-1', status: 'UPDATED', connector: { id: 200, name: 'MeuPluggy' } }),
      )
    const client = new PluggyClient(configMock())

    await client.getItem('item-1')
    await client.getItem('item-1')

    const authCalls = fetchMock.mock.calls.filter((call) => call[0] === 'https://api.pluggy.ai/auth')
    expect(authCalls).toHaveLength(2)
  })

  it('listAccounts devolve a lista de contas do item (1 página só)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(
        jsonResponse(200, { results: [{ id: 'acc-1', type: 'CREDIT', name: 'Nubank' }], page: 1, totalPages: 1 }),
      )
    const client = new PluggyClient(configMock())

    await expect(client.listAccounts('item-1')).resolves.toEqual([{ id: 'acc-1', type: 'CREDIT', name: 'Nubank' }])
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.pluggy.ai/accounts?itemId=item-1&page=1')
  })

  it('listAccounts percorre todas as páginas quando totalPages > 1', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(
        jsonResponse(200, { results: [{ id: 'acc-1', type: 'CREDIT', name: 'Nubank' }], page: 1, totalPages: 2 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { results: [{ id: 'acc-2', type: 'BANK', name: 'Nubank conta' }], page: 2, totalPages: 2 }),
      )
    const client = new PluggyClient(configMock())

    const result = await client.listAccounts('item-1')

    expect(result).toEqual([
      { id: 'acc-1', type: 'CREDIT', name: 'Nubank' },
      { id: 'acc-2', type: 'BANK', name: 'Nubank conta' },
    ])
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.pluggy.ai/accounts?itemId=item-1&page=1')
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.pluggy.ai/accounts?itemId=item-1&page=2')
  })

  it('listTransactions sem cursor usa o endpoint v2; `next` na prática é só querystring, não URL absoluta', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(200, { results: [], next: '?accountId=acc-1&after=cursor-abc' }))
    const client = new PluggyClient(configMock())

    const page = await client.listTransactions('acc-1')

    expect(fetchMock.mock.calls[1][0]).toBe('https://api.pluggy.ai/v2/transactions?accountId=acc-1')
    expect(page.next).toBe('?accountId=acc-1&after=cursor-abc')

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { results: [], next: null }))
    await client.listTransactions('acc-1', page.next!)
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.pluggy.ai/v2/transactions?accountId=acc-1&after=cursor-abc')
  })

  it('listTransactions: se o `next` algum dia vier como URL absoluta, usa ela direto', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(200, { results: [], next: null }))
    const client = new PluggyClient(configMock())

    await client.listTransactions('acc-1', 'https://api.pluggy.ai/v2/transactions?accountId=acc-1&after=xyz')

    expect(fetchMock.mock.calls[1][0]).toBe('https://api.pluggy.ai/v2/transactions?accountId=acc-1&after=xyz')
  })

  it('resposta que não bate com o schema esperado vira PluggyUnavailableError, nunca vaza o corpo cru', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(200, { lixo: true }))
    const client = new PluggyClient(configMock())

    await expect(client.getItem('item-1')).rejects.toBeInstanceOf(PluggyUnavailableError)
  })

  it('429 respeita o Retry-After e tenta de novo', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '0' }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'item-1', status: 'UPDATED', connector: { id: 200, name: 'MeuPluggy' } }),
      )
    const client = new PluggyClient(configMock())

    await expect(client.getItem('item-1')).resolves.toMatchObject({ id: 'item-1' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('500 tenta de novo com backoff, e desiste depois de 3 tentativas', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(500, {}))
    const client = new PluggyClient(configMock())

    await expect(client.getItem('item-1')).rejects.toBeInstanceOf(PluggyUnavailableError)
    expect(fetchMock).toHaveBeenCalledTimes(4) // 1 auth + 3 tentativas
  })

  it('deleteItem: chama DELETE /items/:id com a API key, sem esperar corpo de resposta', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
    const client = new PluggyClient(configMock())

    await client.deleteItem('item-1')

    const [, deleteCall] = fetchMock.mock.calls as [unknown, [string, RequestInit]]
    expect(deleteCall[0]).toBe('https://api.pluggy.ai/items/item-1')
    expect(deleteCall[1].method).toBe('DELETE')
  })

  it('deleteItem: 500 tenta de novo (mesmo retry/backoff de toda outra chamada)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(200, {}))
    const client = new PluggyClient(configMock())

    await expect(client.deleteItem('item-1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('deleteItem: 404 conta como sucesso (item já não existe lá — nunca trava um retry depois de uma escrita local que falhou)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(404, { message: 'not found' }))
    const client = new PluggyClient(configMock())

    await expect(client.deleteItem('item-1')).resolves.toBeUndefined()
  })

  it('400 falha na hora, sem tentar de novo (repetir não ajudaria)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { apiKey: fakeApiKeyJwt(3600) }))
      .mockResolvedValueOnce(jsonResponse(400, {}))
    const client = new PluggyClient(configMock())

    await expect(client.getItem('item-1')).rejects.toBeInstanceOf(PluggyUnavailableError)
    expect(fetchMock).toHaveBeenCalledTimes(2) // 1 auth + 1 tentativa só
  })
})
