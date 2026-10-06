import { Injectable, Logger } from '@nestjs/common'
import type { CardHolderHint, PluggyItem as PluggyItemRow, Rule } from '@prisma/client'
import type { BankConnection, ConnectBankResponse, SyncResult } from '@gastos/shared'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository } from '../account/account.repository'
import { CardHolderHintRepository } from '../card-holder-hint/card-holder-hint.repository'
import { PersonRepository } from '../person/person.repository'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { RuleRepository } from '../rule/rule.repository'
import { BankingSyncRepository } from './banking-sync.repository'
import { mapAccountFields, mapTransaction, reconnectWarningDays } from './banking.mapper'
import { PluggyClient } from './pluggy/pluggy.client'
import { PluggyItemRepository } from './pluggy-item.repository'

const MANUAL_SYNC_COOLDOWN_MS = 15 * 60 * 1000

const NOT_FOUND = () => new NotFoundError('BANK_CONNECTION_NOT_FOUND', 'Conexão bancária não encontrada.')

// Item desconectado (8.5) não existe mais do lado do Pluggy — checar status ou sincronizar contra ele só
// devolveria um erro genérico de "Pluggy indisponível", enganoso pra um estado que é permanente e local.
function assertConnected(item: PluggyItemRow): void {
  if (item.status === 'DISCONNECTED') {
    throw new DomainError(
      'BANK_ITEM_DISCONNECTED',
      'Essa conexão foi desconectada. Conecte de novo pra sincronizar.',
      422,
    )
  }
}

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name)

  constructor(
    private readonly pluggy: PluggyClient,
    private readonly items: PluggyItemRepository,
    private readonly accounts: AccountRepository,
    private readonly sync: BankingSyncRepository,
    private readonly people: PersonRepository,
    private readonly rules: RuleRepository,
    private readonly cardHolderHints: CardHolderHintRepository,
  ) {}

  async connect(userId: string): Promise<ConnectBankResponse> {
    const { pluggyItemId, authorizeUrl } = await this.pluggy.createMeuPluggyItem()
    const item = await this.items.create(userId, {
      pluggyItemId,
      institutionName: 'Meu Pluggy',
      status: 'WAITING_USER_INPUT',
    })
    return { id: item.id, authorizeUrl }
  }

  async listItems(userId: string): Promise<BankConnection[]> {
    return (await this.items.findMany(userId)).map(toConnectionDto)
  }

  // Sem webhook (Meu Pluggy não tem — 07-integracao-bancaria): o front chama isto em polling depois de
  // mandar o usuário para authorizeUrl. Assim que o status vira UPDATED pela primeira vez, sincroniza.
  async checkStatus(userId: string, id: string): Promise<BankConnection> {
    const item = await this.items.findById(userId, id)
    if (!item) throw NOT_FOUND()
    assertConnected(item)

    const remote = await this.pluggy.getItem(item.pluggyItemId)
    // UPDATING é transiente (o Pluggy ainda está buscando) — nunca persistido, só os status finais do enum.
    if (remote.status !== 'UPDATING') {
      await this.items.update(userId, item.id, {
        status: remote.status,
        consentExpiresAt: remote.consentExpiresAt ? new Date(remote.consentExpiresAt) : null,
        lastErrorCode: remote.error?.code ?? null,
      })
    }

    const wasAlreadyUpdated = item.status === 'UPDATED'
    if (remote.status === 'UPDATED' && !wasAlreadyUpdated) {
      await this.runSync(userId, item.id)
    }

    const refreshed = await this.items.findById(userId, id)
    if (!refreshed) throw NOT_FOUND()
    return toConnectionDto(refreshed)
  }

  async syncAllConnected(userId: string): Promise<{ synced: number; failed: number }> {
    const items = await this.items.findConnected(userId)
    let synced = 0
    let failed = 0
    for (const item of items) {
      try {
        await this.runSync(userId, item.id)
        synced++
      } catch (error) {
        failed++
        this.logger.error(`Sync failed for item ${item.id}: ${describeError(error)}`)
      }
    }
    return { synced, failed }
  }

  async manualSync(userId: string, id: string): Promise<SyncResult> {
    const item = await this.items.findById(userId, id)
    if (!item) throw NOT_FOUND()
    assertConnected(item)
    if (item.lastSyncAt) {
      const retryAfterSeconds = Math.ceil((item.lastSyncAt.getTime() + MANUAL_SYNC_COOLDOWN_MS - Date.now()) / 1000)
      if (retryAfterSeconds > 0) {
        throw new DomainError(
          'SYNC_TOO_RECENT',
          'Essa conexão foi atualizada há pouco. Tente de novo em alguns minutos.',
          429,
          {
            retryAfterSeconds,
          },
        )
      }
    }
    return this.runSync(userId, item.id)
  }

  // Desconectar (8.5): revoga o Item no Pluggy (best effort + retry, já embutido no PluggyClient) e marca
  // localmente — histórico (Account/Transaction) nunca é apagado, só para de sincronizar. Idempotente: item
  // já desconectado só devolve o estado atual, sem chamar o Pluggy de novo.
  async disconnect(userId: string, id: string): Promise<BankConnection> {
    const item = await this.items.findById(userId, id)
    if (!item) throw NOT_FOUND()
    if (item.status === 'DISCONNECTED') return toConnectionDto(item)

    await this.pluggy.deleteItem(item.pluggyItemId)
    await this.items.update(userId, item.id, { status: 'DISCONNECTED' })

    const refreshed = await this.items.findById(userId, id)
    if (!refreshed) throw NOT_FOUND()
    return toConnectionDto(refreshed)
  }

  // Reconectar (8.4): testado ao vivo contra o Pluggy real que PATCH no Item não é suportado pelo conector
  // Meu Pluggy ("MeuPluggy item cant be updated") — diferente do que 07-integracao-bancaria assumia. Então
  // reconectar cria um Item novo, igual o connect() original; Account/histórico não duplicam porque
  // upsertFromSync já casa pela conta externa do Pluggy (estável entre Items, confirmado ao vivo com 2
  // Items reais pro mesmo banco: mesma Account, mesmas 1674 transações, nunca dobrou).
  async reconnect(userId: string, id: string): Promise<ConnectBankResponse> {
    const oldItem = await this.items.findById(userId, id)
    if (!oldItem) throw NOT_FOUND()

    const { pluggyItemId, authorizeUrl } = await this.pluggy.createMeuPluggyItem()
    const newItem = await this.items.create(userId, {
      pluggyItemId,
      institutionName: oldItem.institutionName,
      status: 'WAITING_USER_INPUT',
    })

    // Revoga o item antigo, melhor esforço (mesma lógica do disconnect/8.5, já auto-recupera de um 404 de
    // retry) — se falhar, o usuário fica com 2 items por um tempo, sem risco de dado, e ainda pode chamar
    // DELETE nesse item antigo manualmente depois. Nunca bloqueia o reconectar em si, que já deu certo.
    if (oldItem.status !== 'DISCONNECTED') {
      try {
        await this.pluggy.deleteItem(oldItem.pluggyItemId)
        await this.items.update(userId, oldItem.id, { status: 'DISCONNECTED' })
      } catch {
        // melhor esforço — ver comentário acima.
      }
    }

    return { id: newItem.id, authorizeUrl }
  }

  private async runSync(userId: string, itemId: string): Promise<SyncResult> {
    const item = await this.items.findById(userId, itemId)
    if (!item) throw NOT_FOUND()

    const selfPerson = await this.people.findSelf(userId)
    if (!selfPerson) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    const ruleByMerchant = new Map((await this.rules.findMany(userId)).map((rule: Rule) => [rule.merchant, rule]))
    // Chave accountId:cardLast4 — o mesmo final pode existir em contas diferentes (2.3).
    const hintByAccountCard = new Map(
      (await this.cardHolderHints.findMany(userId)).map((hint: CardHolderHint) => [
        `${hint.accountId}:${hint.cardLast4}`,
        hint.personId,
      ]),
    )

    const pluggyAccounts = await this.pluggy.listAccounts(item.pluggyItemId)
    let accountsSynced = 0
    let transactionsSynced = 0

    for (const pluggyAccount of pluggyAccounts) {
      const fields = mapAccountFields(pluggyAccount)
      const isCreditCard = fields.type === 'CREDIT_CARD'
      // balanceCents fora do update quando o Pluggy não mandou saldo nesse sync (fields.balanceCents null):
      // uma omissão pontual do lado do Pluggy não pode apagar o último saldo bom que já tínhamos — cartão
      // de crédito nunca manda saldo mesmo (sempre null), então nunca atualiza aqui, o que já é o esperado.
      const { balanceCents, closingDay, dueDay, creditLimitCents, ...updateBase } = fields
      const updateFieldsWithoutBalance = {
        ...updateBase,
        ...(closingDay != null ? { closingDay } : {}),
        ...(dueDay != null ? { dueDay } : {}),
        ...(creditLimitCents != null ? { creditLimitCents } : {}),
      }
      // pluggyItemId também no update: sem isso, uma conta que já existia (upsert bate no update, não no
      // create) nunca troca de dono quando reconectar (8.4) cria um Item novo — ficava presa apontando pro
      // Item antigo revogado, e disconnected/lastSyncAt (8.5/8.6) mentiam mesmo com o Item novo sincronizando
      // em dia. Achado testando reconectar ao vivo com 2 Items reais pro mesmo banco.
      const account = await this.accounts.upsertFromSync(
        userId,
        pluggyAccount.id,
        { ...fields, name: pluggyAccount.name, source: 'PLUGGY', pluggyItemId: item.id },
        { ...updateFieldsWithoutBalance, pluggyItemId: item.id, ...(balanceCents != null ? { balanceCents } : {}) },
      )
      accountsSynced++

      let cursor: string | undefined
      do {
        const page = await this.pluggy.listTransactions(pluggyAccount.id, cursor)
        for (const tx of page.results) {
          const mapped = mapTransaction(tx, isCreditCard)
          const merchant = mapped.merchant ?? null
          const cardLast4 = mapped.cardLast4 ?? null
          // Pessoa/categoria só existem em cartão de crédito (03-regras-negocio § Escopo) — movimentação
          // nunca ganha nenhum dos dois, nem por Rule.
          const personId = isCreditCard
            ? resolvePersonId(account.id, cardLast4, merchant, hintByAccountCard, ruleByMerchant, selfPerson.id)
            : null
          const categoryId = isCreditCard ? resolveCategoryId(merchant, ruleByMerchant) : null
          await this.sync.upsertTransaction(userId, account.id, personId, categoryId, mapped)
          transactionsSynced++
        }
        cursor = page.next ?? undefined
      } while (cursor)
    }

    await this.items.update(userId, item.id, { lastSyncAt: new Date() })
    return { accountsSynced, transactionsSynced }
  }
}

// Pipeline de atribuição na criação (03-regras-negocio § Atribuição de pessoa), parando no primeiro que
// decidir: (1) já confirmada pelo User nunca é tocada aqui — upsertTransaction só atribui pessoa na
// criação, nunca no update, então isso já está garantido antes de chegar aqui; (2) CardHolderHint (2.3,
// cartão adicional/virtual); (3) Rule por estabelecimento; (4) padrão self.
function resolvePersonId(
  accountId: string,
  cardLast4: string | null,
  merchant: string | null,
  hintByAccountCard: Map<string, string>,
  ruleByMerchant: Map<string, Rule>,
  selfPersonId: string,
): string {
  const hintPersonId = cardLast4 ? hintByAccountCard.get(`${accountId}:${cardLast4}`) : undefined
  if (hintPersonId) return hintPersonId
  if (!merchant) return selfPersonId
  return ruleByMerchant.get(normalizeMerchant(merchant))?.personId ?? selfPersonId
}

// Sem Rule pro estabelecimento, nasce sem categoria (03-regras-negocio § Categorias e regras) — nunca
// inventa uma; quem decide isso além da Rule é o usuário ou, no futuro, a sugestão de IA (Sprint 7).
function resolveCategoryId(merchant: string | null, ruleByMerchant: Map<string, Rule>): string | null {
  if (!merchant) return null
  return ruleByMerchant.get(normalizeMerchant(merchant))?.categoryId ?? null
}

function describeError(error: unknown): string {
  if (error instanceof DomainError) return error.code
  return error instanceof Error ? error.name : 'UnknownError'
}

function toConnectionDto(row: PluggyItemRow): BankConnection {
  return {
    id: row.id,
    institutionName: row.institutionName,
    status: row.status,
    consentExpiresAt: row.consentExpiresAt?.toISOString() ?? null,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt.toISOString(),
    reconnectWarningDays: reconnectWarningDays(row.consentExpiresAt, new Date()),
  }
}
