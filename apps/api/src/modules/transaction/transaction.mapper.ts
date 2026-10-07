import type { Transaction as TransactionRow } from '@prisma/client'
import type { Transaction } from '@gastos/shared'

export function toTransactionDto(
  row: TransactionRow,
  splits: { personId: string; amountCents: number }[] = [],
): Transaction {
  return {
    id: row.id,
    accountId: row.accountId,
    kind: row.kind,
    status: row.status,
    amountCents: row.amountCents,
    occurredAt: row.occurredAt.toISOString(),
    description: row.description,
    merchant: row.merchant,
    categoryId: row.categoryId,
    categorySuggestedId: row.categorySuggestedId,
    categorySuggestionConfidence: row.categorySuggestionConfidence,
    personId: row.personId,
    note: row.note,
    cardLast4: row.cardLast4,
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    installmentDueAt: row.installmentDueAt?.toISOString() ?? null,
    displayName: row.displayName,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    splits,
  }
}
