import { Injectable } from '@nestjs/common'
import type { BudgetMonth as BudgetMonthRow } from '@prisma/client'
import type { BudgetMonth, UpdateBudgetMonthInput } from '@gastos/shared'
import { monthKey } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { BudgetMonthRepository } from './budget-month.repository'
import { toBudgetMonthDto } from './budget.mapper'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const ZERO = {
  incomeCents: 0,
  firstHalfIncomeCents: 0,
  secondHalfIncomeCents: 0,
  benefitCents: 0,
  fixedExpensesCents: 0,
  savingsGoalCents: 0,
}

@Injectable()
export class BudgetMonthService {
  constructor(private readonly repo: BudgetMonthRepository) {}

  // Mês atual ou o próximo sem configuração ainda: cria copiando o mês configurado mais recente (virada
  // de mês, e dá pra planejar 1 mês à frente). Mês passado sem linha nunca existiu: zero, sem gravar nada.
  // Mês futuro além do seguinte: projeta o mês configurado mais recente só na resposta (o teto de hoje
  // continua valendo até o usuário mudar), sem gravar — GET nunca cria linha pra um mês arbitrariamente
  // distante só porque alguém perguntou (03-regras-negocio).
  async getOrCreate(userId: string, month?: string): Promise<BudgetMonth> {
    const key = resolveKey(month)
    const row = await this.resolveRow(userId, key)
    if (row) return toBudgetMonthDto(row)

    if (key > monthKey(new Date())) {
      const previous = await this.repo.findMostRecentBefore(userId, key)
      if (previous) return { ...toBudgetMonthDto(previous), month: key }
    }
    return { month: key, ...ZERO, variableCapCents: 0 }
  }

  // Mês fechado é imutável: editar a renda de hoje nunca reescreve o passado.
  async update(userId: string, month: string | undefined, input: UpdateBudgetMonthInput): Promise<BudgetMonth> {
    const key = resolveKey(month)
    assertMonthOpen(key)
    const { firstHalfIncomeCents, secondHalfIncomeCents, ...rest } = input
    const row = await this.repo.upsert(userId, key, {
      ...rest,
      firstHalfIncomeCents,
      incomeCents: firstHalfIncomeCents + secondHalfIncomeCents,
    })
    return toBudgetMonthDto(row)
  }

  private async resolveRow(userId: string, key: string): Promise<BudgetMonthRow | null> {
    const existing = await this.repo.findByMonth(userId, key)
    if (existing) return existing
    if (!isCurrentOrNextMonth(key)) return null

    const previous = await this.repo.findMostRecentBefore(userId, key)
    return this.repo.createIfMissing(userId, key, {
      incomeCents: previous?.incomeCents ?? 0,
      firstHalfIncomeCents: previous?.firstHalfIncomeCents ?? 0,
      benefitCents: previous?.benefitCents ?? 0,
      fixedExpensesCents: previous?.fixedExpensesCents ?? 0,
      savingsGoalCents: previous?.savingsGoalCents ?? 0,
    })
  }
}

function resolveKey(month?: string): string {
  const key = month ?? monthKey(new Date())
  if (!MONTH_KEY_PATTERN.test(key)) {
    throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
  }
  return key
}

function isPast(month: string): boolean {
  return month < monthKey(new Date())
}

// Mês fechado é imutável: editar a renda de hoje nunca reescreve o passado.
export function assertMonthOpen(month: string): void {
  if (isPast(month)) {
    throw new DomainError('BUDGET_MONTH_CLOSED', 'Mês fechado não pode ser editado.', 422)
  }
}

// Janela em que o auto-create do GET vale: o mês atual, ou o seguinte (pra planejar com antecedência).
// Sempre a partir da string AAAA-MM (já em America/Manaus via monthKey) — nunca de Date local, que
// dependeria do fuso do servidor.
function isCurrentOrNextMonth(month: string): boolean {
  const current = monthKey(new Date())
  return month === current || month === nextMonthKey(current)
}

function nextMonthKey(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key)
  if (!match) throw new Error(`monthKey inválido: "${key}"`)
  const [, yearStr, monthStr] = match
  const year = Number(yearStr)
  const month = Number(monthStr)
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
}
