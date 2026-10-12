import { clusterInstallmentKeys } from '../../common/installment-group'
import { splitProportionally } from '../split/split-proportionally'

interface Share {
  personId: string
  amountCents: number
}

export interface InstallmentRowWithSplits {
  id: string
  accountId: string
  description: string
  occurredAt: Date
  amountCents: number
  installmentNumber: number | null
  installmentTotal: number | null
  personId: string | null
  splits: Share[]
}

export interface InstallmentInheritance {
  transactionId: string
  personId: string | null
  splits: Share[]
}

function sameAssignment(row: InstallmentRowWithSplits, personId: string | null, splits: Share[]): boolean {
  if (row.personId !== personId || row.splits.length !== splits.length) return false
  return splits.every((share) =>
    row.splits.some((current) => current.personId === share.personId && current.amountCents === share.amountCents),
  )
}

export function inheritInstallmentAssignments(
  rows: InstallmentRowWithSplits[],
  createdIds: Set<string>,
): InstallmentInheritance[] {
  const keys = clusterInstallmentKeys(rows)
  const result: InstallmentInheritance[] = []
  rows.forEach((row, index) => {
    if (!createdIds.has(row.id) || row.installmentNumber == null) return
    const number = row.installmentNumber
    let reference: InstallmentRowWithSplits | undefined
    rows.forEach((candidate, candidateIndex) => {
      if (keys[candidateIndex] !== keys[index] || createdIds.has(candidate.id)) return
      if (candidate.installmentNumber == null || candidate.installmentNumber >= number) return
      if (!reference || candidate.installmentNumber > (reference.installmentNumber ?? 0)) reference = candidate
    })
    if (!reference) return

    const splits = reference.splits.length > 0 ? splitProportionally(row.amountCents, reference.splits) : []
    const personId = reference.splits.length > 0 ? null : reference.personId
    if (!sameAssignment(row, personId, splits)) result.push({ transactionId: row.id, personId, splits })
  })
  return result
}
