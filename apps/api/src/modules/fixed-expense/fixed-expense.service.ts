import { Injectable } from '@nestjs/common'
import type { FixedExpense as FixedExpenseRow } from '@prisma/client'
import type { CreateFixedExpenseInput, FixedExpense, UpdateFixedExpenseInput } from '@gastos/shared'
import { NotFoundError } from '../../common/errors/domain.error'
import { FixedExpenseRepository } from './fixed-expense.repository'

const NOT_FOUND = () => new NotFoundError('FIXED_EXPENSE_NOT_FOUND', 'Gasto fixo não encontrado.')

@Injectable()
export class FixedExpenseService {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async create(userId: string, input: CreateFixedExpenseInput): Promise<FixedExpense> {
    return toDto(await this.repo.create(userId, input.name, input.amountCents))
  }

  async update(userId: string, id: string, input: UpdateFixedExpenseInput): Promise<FixedExpense> {
    const result = await this.repo.update(userId, id, input)
    if (result.count === 0) throw NOT_FOUND()
    const row = await this.repo.findById(userId, id)
    if (!row) throw NOT_FOUND()
    return toDto(row)
  }

  async list(userId: string, includeArchived: boolean): Promise<FixedExpense[]> {
    return (await this.repo.findMany(userId, includeArchived)).map(toDto)
  }

  // Soma dos ativos (03-regras-negocio § Orçamento mensal) — entra junto da fatura aberta no ritmo (HU 7.4).
  async sumActiveCents(userId: string): Promise<number> {
    const rows = await this.repo.findMany(userId, false)
    return rows.reduce((total, row) => total + row.amountCents, 0)
  }

  async archive(userId: string, id: string): Promise<void> {
    const result = await this.repo.archive(userId, id)
    if (result.count === 0) throw NOT_FOUND()
  }
}

function toDto(row: FixedExpenseRow): FixedExpense {
  return {
    id: row.id,
    name: row.name,
    amountCents: row.amountCents,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
