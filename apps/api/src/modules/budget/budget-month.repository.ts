import { Inject, Injectable } from '@nestjs/common'
import type { BudgetMonth } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

export interface BudgetMonthValues {
  incomeCents: number
  benefitCents: number
  fixedExpensesCents: number
  savingsGoalCents: number
}

@Injectable()
export class BudgetMonthRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findByMonth(userId: string, month: string): Promise<BudgetMonth | null> {
    return this.prisma.budgetMonth.findFirst({ where: { userId, month } })
  }

  // "AAAA-MM" ordena igual string e igual data — o mais recente ANTES de `month` é de onde a virada copia
  // as configurações (03-regras-negocio § Orçamento mensal).
  findMostRecentBefore(userId: string, month: string): Promise<BudgetMonth | null> {
    return this.prisma.budgetMonth.findFirst({
      where: { userId, month: { lt: month } },
      orderBy: { month: 'desc' },
    })
  }

  // Upsert com update vazio: cria se não existir, ou devolve a linha existente sem tocar nela — atômico,
  // sem o TOCTOU de um create() depois de um findByMonth() que não achou nada (duas leituras concorrentes
  // do mesmo mês novo não colidem no @@unique([userId, month])).
  createIfMissing(userId: string, month: string, values: BudgetMonthValues): Promise<BudgetMonth> {
    return this.prisma.budgetMonth.upsert({
      where: { userId_month: { userId, month } },
      create: { ...values, userId, month },
      update: {},
    })
  }

  upsert(userId: string, month: string, values: BudgetMonthValues): Promise<BudgetMonth> {
    return this.prisma.budgetMonth.upsert({
      where: { userId_month: { userId, month } },
      create: { ...values, userId, month },
      update: values,
    })
  }
}
