import { Injectable } from '@nestjs/common'
import type { SavingsReport, SpendingReport, SubscriptionReport } from '@gastos/shared'
import { dayOfMonth, monthKey, monthRange, shiftMonthKey } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { PersonRepository } from '../person/person.repository'
import { detectDuplicateCharges } from './duplicate-charge.mapper'
import {
  bucketByMonth,
  buildBreakdown,
  monthsWithRows,
  sumByCategory,
  sumByMerchant,
  sumByPerson,
  totalCents,
} from './insight.mapper'
import { InsightRepository } from './insight.repository'
import { buildSavingsReport } from './savings.mapper'
import { detectSubscriptions } from './subscription.mapper'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
// Meses de histórico olhados pra achar recorrência (>= 3 cobranças, com folga).
const SUBSCRIPTION_LOOKBACK_MONTHS = 12

@Injectable()
export class InsightService {
  constructor(
    private readonly repo: InsightRepository,
    private readonly people: PersonRepository,
  ) {}

  // "Para onde vai o dinheiro" (HU 9.1): categoria/estabelecimento (só a parte do dono) e pessoa (todas) do
  // mês pedido, com variação vs. mês anterior e vs. média dos 3 meses anteriores a ele — mesma janela usada
  // por "categoria acima do normal". No mês corrente, os meses de comparação só contam até o mesmo dia
  // (mesmo período); num mês passado, é mês inteiro contra mês inteiro.
  async spendingReport(userId: string, month?: string): Promise<SpendingReport> {
    const today = new Date()
    const key = month ?? monthKey(today)
    if (!MONTH_KEY_PATTERN.test(key)) {
      throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
    }
    const selfId = await this.selfPersonId(userId)

    const previousKeys = [-1, -2, -3].map((delta) => shiftMonthKey(key, delta))
    const throughDay = key === monthKey(today) ? dayOfMonth(today) : null

    const rows = await this.repo.findRows(userId, key)
    const buckets = bucketByMonth(rows, [key, ...previousKeys], throughDay)
    const rowsOf = (monthKey: string) => buckets.get(monthKey) ?? []
    const current = rowsOf(key)
    const previous = rowsOf(shiftMonthKey(key, -1))
    const last3Months = previousKeys.map(rowsOf)
    const presentMonths = monthsWithRows(rows, previousKeys)
    const hasFullHistory = previousKeys.every((previousKey) => presentMonths.has(previousKey))

    return {
      month: key,
      totalCents: totalCents(current, selfId),
      throughDay,
      byCategory: buildBreakdown(
        sumByCategory(current, selfId),
        sumByCategory(previous, selfId),
        last3Months.map((monthRows) => sumByCategory(monthRows, selfId)),
        { flagAboveNormal: true, hasFullHistory },
      ),
      byMerchant: buildBreakdown(
        sumByMerchant(current, selfId),
        sumByMerchant(previous, selfId),
        last3Months.map((monthRows) => sumByMerchant(monthRows, selfId)),
      ),
      byPerson: buildBreakdown(
        sumByPerson(current),
        sumByPerson(previous),
        last3Months.map((monthRows) => sumByPerson(monthRows)),
      ),
    }
  }

  // Assinaturas ativas (HU 9.2): recorrência de cobrança mensal no cartão, olhando os últimos meses. É um
  // retrato de agora — não tem "mês" pra escolher.
  async subscriptions(userId: string): Promise<SubscriptionReport> {
    const today = new Date()
    const selfId = await this.selfPersonId(userId)
    const since = monthRange(shiftMonthKey(monthKey(today), -SUBSCRIPTION_LOOKBACK_MONTHS)).start
    const rows = await this.repo.findSubscriptionRows(userId, since)
    return detectSubscriptions(rows, selfId, today)
  }

  // "Onde economizar" (HU 9.5): junta os três sinais já calculados — categoria acima do normal (do mês
  // pedido), assinatura ativa e cobrança duplicada (no mês pedido) — num ranking só, cada item com o cálculo
  // à mostra.
  async savings(userId: string, month?: string): Promise<SavingsReport> {
    const key = month ?? monthKey(new Date())
    const [spending, subscriptionReport] = await Promise.all([
      this.spendingReport(userId, key),
      this.subscriptions(userId),
    ])

    const selfId = await this.selfPersonId(userId)
    const rows = await this.repo.findRows(userId, key)
    // Duplicidade olha a data real da cobrança (occurredAt), nunca o mês da parcela (effectiveMonthKey):
    // bucketByMonth deslocaria parcela antiga pro mês em que ela cai, o que não faz sentido aqui.
    const currentMonthRows = rows.filter((row) => monthKey(row.occurredAt) === key)
    const duplicateCharges = detectDuplicateCharges(currentMonthRows, selfId)

    return { items: buildSavingsReport(spending.byCategory, subscriptionReport.items, duplicateCharges) }
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}
