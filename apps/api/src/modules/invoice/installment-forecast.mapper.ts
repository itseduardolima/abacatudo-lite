export interface InstallmentSource {
  groupKey: string
  number: number
  total: number
  dueAt: Date
  amountCents: number
  kind: 'EXPENSE' | 'REFUND'
  personId: string | null
  splits: { personId: string; amountCents: number }[]
  label: string
}

export type RawInstallmentSource = Omit<InstallmentSource, 'dueAt'> & { dueAt: Date | null }

const MAX_INSTALLMENTS = 120

// Soma meses mantendo o dia do vencimento (limitado ao fim do mês: 31/01 + 1 mês = 28/02). Datas de parcela
// são guardadas ao meio-dia UTC (dayFromDateString), então o dia de Manaus é o mesmo do UTC.
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000

export function addMonthsKeepingDay(date: Date, months: number): Date {
  const local = new Date(date.getTime() - BRASILIA_OFFSET_MS)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  const day = local.getUTCDate()
  const target = new Date(Date.UTC(year, month + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(day, lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ),
  )
}

// Parcelas estimadas (03-regras-negocio § Fatura prevista): nem todo banco manda as parcelas futuras (BB e
// Pic Pay só mandam quando caem na fatura). Pra cada compra cuja última parcela conhecida é k de N (k < N),
// cria k+1..N com o mesmo valor e o mesmo vencimento, mês a mês. Nada disso é gravado: recalcula a cada
// consulta, então quando o banco lança a parcela de verdade ela vira a referência (k sobe) e a estimada
// some sozinha, sem duplicar. Banco que já manda tudo (Nubank) chega com k = N: nada é estimado.
export function estimateInstallments(sources: InstallmentSource[]): InstallmentSource[] {
  const latestByGroup = new Map<string, InstallmentSource>()
  for (const source of sources) {
    const current = latestByGroup.get(source.groupKey)
    if (!current || source.number > current.number) latestByGroup.set(source.groupKey, source)
  }

  const estimated: InstallmentSource[] = []
  for (const latest of latestByGroup.values()) {
    if (latest.total > MAX_INSTALLMENTS || latest.number >= latest.total) continue
    for (let number = latest.number + 1; number <= latest.total; number++) {
      estimated.push({ ...latest, number, dueAt: addMonthsKeepingDay(latest.dueAt, number - latest.number) })
    }
  }
  return estimated
}

export function resolveInstallmentDueDates(sources: RawInstallmentSource[]): InstallmentSource[] {
  const latestDated = new Map<string, InstallmentSource>()
  for (const source of sources) {
    if (!source.dueAt) continue
    const current = latestDated.get(source.groupKey)
    if (!current || source.number > current.number) latestDated.set(source.groupKey, { ...source, dueAt: source.dueAt })
  }
  return sources.flatMap((source) => {
    if (source.dueAt) return [{ ...source, dueAt: source.dueAt }]
    const base = latestDated.get(source.groupKey)
    if (!base || source.number <= base.number) return []
    return [{ ...source, dueAt: addMonthsKeepingDay(base.dueAt, source.number - base.number) }]
  })
}
