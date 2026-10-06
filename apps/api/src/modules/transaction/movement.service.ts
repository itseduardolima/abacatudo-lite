import { Injectable } from '@nestjs/common'
import type { MovementTotals, Transaction } from '@gastos/shared'
import { resolveMonthRange } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { MovementRepository } from './movement.repository'
import { toTransactionDto } from './transaction.mapper'

export interface MovementListQuery {
  month?: string
  accountId?: string
  direction?: string
  search?: string
}

@Injectable()
export class MovementService {
  constructor(private readonly repo: MovementRepository) {}

  async listByMonth(userId: string, query: MovementListQuery): Promise<Transaction[]> {
    const range = resolveMonthRange(query.month)
    const direction = resolveDirection(query.direction)
    const rows = await this.repo.findMany(userId, range, {
      accountId: query.accountId,
      direction,
      search: query.search,
    })
    // Movimentação nunca tem split (03-regras-negocio § Escopo: só existe em cartão de crédito) — nunca
    // passa `row.splits` aqui de propósito, mesmo que o tipo do row tivesse o campo.
    return rows.map((row) => toTransactionDto(row))
  }

  async totals(userId: string, month?: string): Promise<MovementTotals> {
    return this.repo.totals(userId, resolveMonthRange(month))
  }
}

function resolveDirection(direction?: string): 'IN' | 'OUT' | undefined {
  if (!direction) return undefined
  if (direction !== 'IN' && direction !== 'OUT') {
    throw new DomainError('INVALID_DIRECTION', 'Direção inválida (esperado IN ou OUT).', 400)
  }
  return direction
}
