import { Inject, Injectable } from '@nestjs/common'
import type { Prisma, Transaction } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

export interface MovementFilters {
  accountId?: string
  direction?: 'IN' | 'OUT'
  search?: string
}

// "Saída" inclui CARD_PAYMENT: o pagamento da fatura debita a conta corrente, mesmo não sendo um EXPENSE
// (03-regras-negocio § Movimentações — essa linha nunca é gasto do lado do cartão, mas aqui é dinheiro
// saindo de verdade).
const OUT_KINDS: Transaction['kind'][] = ['EXPENSE', 'CARD_PAYMENT']

// Tudo que não é CREDIT_CARD (03-regras-negocio § Escopo): só consulta, sem categoria/pessoa/orçamento/IA.
@Injectable()
export class MovementRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string, range: { start: Date; end: Date }, filters: MovementFilters = {}): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: this.where(userId, range, filters),
      orderBy: { occurredAt: 'desc' },
    })
  }

  async totals(
    userId: string,
    range: { start: Date; end: Date },
  ): Promise<{ incomeCents: number; expenseCents: number }> {
    const scope = {
      userId,
      occurredAt: { gte: range.start, lt: range.end },
      account: { type: { not: 'CREDIT_CARD' } },
    } as const
    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { ...scope, kind: 'INCOME' }, _sum: { amountCents: true } }),
      this.prisma.transaction.aggregate({ where: { ...scope, kind: { in: OUT_KINDS } }, _sum: { amountCents: true } }),
    ])
    return { incomeCents: income._sum.amountCents ?? 0, expenseCents: expense._sum.amountCents ?? 0 }
  }

  private where(
    userId: string,
    range: { start: Date; end: Date },
    filters: MovementFilters,
  ): Prisma.TransactionWhereInput {
    return {
      userId,
      occurredAt: { gte: range.start, lt: range.end },
      account: { type: { not: 'CREDIT_CARD' }, ...(filters.accountId ? { id: filters.accountId } : {}) },
      ...(filters.direction === 'IN' ? { kind: 'INCOME' } : {}),
      ...(filters.direction === 'OUT' ? { kind: { in: OUT_KINDS } } : {}),
      ...(filters.search
        ? {
            OR: [
              { description: { contains: filters.search, mode: 'insensitive' as const } },
              { merchant: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
  }
}
