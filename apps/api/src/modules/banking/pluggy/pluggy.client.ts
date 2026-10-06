import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { z } from 'zod'
import { DomainError } from '../../../common/errors/domain.error'
import {
  pluggyAccountsPageSchema,
  pluggyAuthResponseSchema,
  pluggyItemSchema,
  pluggyTransactionsPageSchema,
  type PluggyAccount,
  type PluggyItem,
  type PluggyTransaction,
} from './pluggy.schemas'

const BASE_URL = 'https://api.pluggy.ai'
const REQUEST_TIMEOUT_MS = 15_000
const MAX_ATTEMPTS = 3
// Único conector gratuito para uso pessoal (07-integracao-bancaria § Resultado do spike).
const MEU_PLUGGY_CONNECTOR_ID = 200
// Trava de segurança contra paginação que nunca termina — bem acima do que uma pessoa física teria de contas.
const MAX_ACCOUNT_PAGES = 20
// A resposta da criação do item vem com `parameter: null` — o link OAuth ainda está sendo gerado (visto
// na prática: ~2s). Espera curta e limitada antes de desistir.
const AUTHORIZE_URL_POLL_ATTEMPTS = 5
const AUTHORIZE_URL_POLL_MS = 1500

export class PluggyUnavailableError extends DomainError {
  constructor() {
    super('PLUGGY_UNAVAILABLE', 'Não foi possível falar com o Pluggy agora. Tente de novo em instantes.', 502)
  }
}

export class PluggyNotConfiguredError extends DomainError {
  constructor() {
    super('PLUGGY_NOT_CONFIGURED', 'Integração bancária não configurada neste ambiente.', 501)
  }
}

@Injectable()
export class PluggyClient {
  private cachedApiKey: { value: string; expiresAt: number } | null = null

  constructor(private readonly config: ConfigService) {}

  async createMeuPluggyItem(): Promise<{ pluggyItemId: string; authorizeUrl: string }> {
    const item = await this.request('POST', '/items', pluggyItemSchema, {
      connectorId: MEU_PLUGGY_CONNECTOR_ID,
      parameters: {},
    })
    return { pluggyItemId: item.id, authorizeUrl: await this.waitForAuthorizeUrl(item) }
  }

  getItem(pluggyItemId: string): Promise<PluggyItem> {
    return this.request('GET', `/items/${pluggyItemId}`, pluggyItemSchema)
  }

  // Desconectar (8.5): "revoga o Item no Pluggy, best effort + retry" (03-regras-negocio) — o retry/backoff
  // já vem de fetchWithRetry, mesmo caminho de toda outra chamada. Sem corpo esperado na resposta, então
  // não passa pelo `request` (que sempre parseia JSON contra um schema).
  // 404 conta como sucesso: o item já não existe lá — pode ser porque outra desconexão já revogou antes
  // (idempotência normal), ou porque a revogação de uma tentativa anterior deu certo mas a escrita local
  // que marca DISCONNECTED falhou depois (queda de conexão, etc.). Sem isso, essa segunda situação travava
  // pra sempre: toda nova tentativa batia o mesmo 404 e nunca conseguia marcar localmente.
  async deleteItem(pluggyItemId: string): Promise<void> {
    await this.fetchWithRetry(
      `${BASE_URL}/items/${pluggyItemId}`,
      { method: 'DELETE', headers: { 'x-api-key': await this.apiKey() } },
      [404],
    )
  }

  // Paginado de verdade (visto na prática: a resposta vem com total/totalPages/page) — sem isso, alguém com
  // contas suficientes pra estourar uma página perdia contas do sync silenciosamente.
  async listAccounts(pluggyItemId: string): Promise<PluggyAccount[]> {
    const results: PluggyAccount[] = []
    for (let page = 1; page <= MAX_ACCOUNT_PAGES; page++) {
      const data = await this.request('GET', `/accounts?itemId=${pluggyItemId}&page=${page}`, pluggyAccountsPageSchema)
      results.push(...data.results)
      if (page >= (data.totalPages ?? 1)) break
    }
    return results
  }

  async listTransactions(
    accountId: string,
    cursor?: string,
  ): Promise<{ results: PluggyTransaction[]; next: string | null }> {
    const page = await this.request('GET', this.transactionsPath(accountId, cursor), pluggyTransactionsPageSchema)
    return { results: page.results, next: page.next ?? null }
  }

  // `next` na prática é só a querystring ("?accountId=...&after=..."), não uma URL absoluta — mas trata os
  // dois formatos, caso o Pluggy mude isso um dia.
  private transactionsPath(accountId: string, cursor?: string): string {
    if (!cursor) return `/v2/transactions?accountId=${accountId}`
    return cursor.startsWith('http') ? cursor : `/v2/transactions${cursor}`
  }

  private async waitForAuthorizeUrl(item: PluggyItem): Promise<string> {
    if (item.parameter?.data) return item.parameter.data
    for (let attempt = 1; attempt <= AUTHORIZE_URL_POLL_ATTEMPTS; attempt++) {
      await sleep(AUTHORIZE_URL_POLL_MS)
      const refreshed = await this.getItem(item.id)
      if (refreshed.parameter?.data) return refreshed.parameter.data
    }
    throw new PluggyUnavailableError()
  }

  private async apiKey(): Promise<string> {
    if (this.cachedApiKey && this.cachedApiKey.expiresAt > Date.now()) return this.cachedApiKey.value

    const clientId = this.config.get<string>('PLUGGY_CLIENT_ID')
    const clientSecret = this.config.get<string>('PLUGGY_CLIENT_SECRET')
    if (!clientId || !clientSecret) throw new PluggyNotConfiguredError()

    const response = await this.fetchWithRetry(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    })
    const parsed = pluggyAuthResponseSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) throw new PluggyUnavailableError()

    const expiresAt = decodeJwtExpiryMs(parsed.data.apiKey) ?? Date.now() + 60 * 60 * 1000
    this.cachedApiKey = { value: parsed.data.apiKey, expiresAt: expiresAt - 60_000 }
    return this.cachedApiKey.value
  }

  private async request<T>(
    method: 'GET' | 'POST',
    pathOrUrl: string,
    schema: z.ZodType<T>,
    body?: unknown,
  ): Promise<T> {
    const apiKey = await this.apiKey()
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`
    const response = await this.fetchWithRetry(url, {
      method,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const parsed = schema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) throw new PluggyUnavailableError()
    return parsed.data
  }

  // `treatAsSuccess`: status que não é 2xx mas deve ser aceito como se fosse (ex.: 404 no delete de um item
  // que já não existe lá — ver deleteItem, o motivo é evitar reintroduzir o bug do parágrafo abaixo).
  private async fetchWithRetry(url: string, init: RequestInit, treatAsSuccess: number[] = []): Promise<Response> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const response = await fetch(url, { ...init, signal: controller.signal })
        clearTimeout(timer)

        if (response.status === 429) {
          await sleep((Number(response.headers.get('retry-after')) || 2) * 1000)
          continue
        }
        if (response.status >= 500) {
          if (attempt === MAX_ATTEMPTS) throw new PluggyUnavailableError()
          await sleep(2 ** attempt * 200)
          continue
        }
        if (!response.ok && !treatAsSuccess.includes(response.status)) throw new PluggyUnavailableError()
        return response
      } catch (error) {
        clearTimeout(timer)
        if (error instanceof DomainError) throw error
        if (attempt === MAX_ATTEMPTS) throw new PluggyUnavailableError()
        await sleep(2 ** attempt * 200)
      }
    }
    throw new PluggyUnavailableError()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function decodeJwtExpiryMs(token: string): number | null {
  const [, payloadSegment] = token.split('.')
  if (!payloadSegment) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8')) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
