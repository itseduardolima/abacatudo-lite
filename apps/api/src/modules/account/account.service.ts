import { Injectable } from '@nestjs/common'
import type { Account, CreateAccountInput, UpdateAccountInput } from '@gastos/shared'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithPluggyItem } from './account.repository'

@Injectable()
export class AccountService {
  constructor(private readonly repo: AccountRepository) {}

  async create(userId: string, input: CreateAccountInput): Promise<Account> {
    const row = await this.repo.create(userId, {
      name: input.name,
      type: input.type,
      source: input.source,
      closingDay: input.closingDay ?? null,
      dueDay: input.dueDay ?? null,
      creditLimitCents: input.creditLimitCents ?? null,
    })
    // Recém-criada, sempre MANUAL (source PLUGGY só existe pelo sync) — nunca tem PluggyItem pra puxar
    // lastSyncAt.
    return toDto({ ...row, pluggyItem: null })
  }

  async list(userId: string, includeArchived: boolean): Promise<Account[]> {
    const rows = await this.repo.findMany(userId, includeArchived)
    return rows.map(toDto)
  }

  async getById(userId: string, id: string): Promise<Account> {
    const row = await this.repo.findById(userId, id)
    if (!row) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    return toDto(row)
  }

  // PATCH único pros campos editáveis (nome, logo do banco, fechamento e vencimento) — só mexe no que veio no body, nunca
  // sobrescreve o outro campo com o valor atual (teria corrida se dois PATCH parciais chegassem juntos).
  async update(userId: string, id: string, input: UpdateAccountInput): Promise<Account> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')

    if (input.name !== undefined) {
      await this.repo.update(userId, id, { name: input.name })
    }

    if (input.bankLogo !== undefined) {
      await this.repo.update(userId, id, { bankLogo: input.bankLogo })
    }

    if (input.closingDay !== undefined || input.dueDay !== undefined || input.closedBillCents !== undefined) {
      if (existing.type !== 'CREDIT_CARD') {
        throw new DomainError('NOT_A_CREDIT_CARD', 'Fechamento e vencimento só existem em cartão de crédito.', 422)
      }
      await this.repo.update(userId, id, {
        ...(input.closingDay !== undefined ? { closingDay: input.closingDay } : {}),
        ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : {}),
        ...(input.closedBillCents !== undefined ? { closedBillCents: input.closedBillCents } : {}),
      })
    }

    const refreshed = await this.repo.findById(userId, id)
    if (!refreshed) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    return toDto(refreshed)
  }

  // Conta removida volta a aparecer (a sincronização do banco nunca desarquiva sozinha, pra não ressuscitar
  // uma conta que o usuário tirou de propósito).
  async restore(userId: string, id: string): Promise<void> {
    const result = await this.repo.restore(userId, id)
    if (result.count === 0) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta removida não encontrada.')
  }

  // Mesmo padrão do FixedExpenseService.archive — soft-delete, nunca apaga Transaction/histórico por
  // trás (findMany/invoice/pace já ignoram conta arquivada por padrão).
  async archive(userId: string, id: string): Promise<void> {
    const result = await this.repo.archive(userId, id)
    if (result.count === 0) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
  }
}

// lastSyncAt: "última atualização" (8.6) é a do PluggyItem por trás da conta — dado velho nunca parece
// atual (se um sync não terminou de verdade, o item nunca chega a atualizar lastSyncAt, ver
// BankingService.runSync). disconnected (8.5): true só quando o PluggyItem foi desconectado localmente —
// histórico continua, a conta só para de sincronizar. Conta MANUAL/IMPORT não tem PluggyItem, então os
// dois ficam sempre null/false.
function toDto(row: AccountWithPluggyItem): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    source: row.source,
    closingDay: row.closingDay,
    closedBillCents: row.closedBillCents,
    dueDay: row.dueDay,
    creditLimitCents: row.creditLimitCents,
    bankLogo: row.bankLogo as Account['bankLogo'],
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lastSyncAt: row.pluggyItem?.lastSyncAt?.toISOString() ?? null,
    disconnected: row.pluggyItem?.status === 'DISCONNECTED',
    bankConnectionId: row.pluggyItemId,
  }
}
