import type { Prisma, AccountType, TransactionKind, TransactionStatus } from '@prisma/client'
import { dayFromDateString } from '../../common/date/timezone'
import type { PluggyAccount, PluggyTransaction } from './pluggy/pluggy.schemas'

export { dayFromDateString }

export type MappedTransaction = Omit<Prisma.TransactionUncheckedCreateInput, 'userId' | 'accountId'> & {
  externalId: string
  kind: TransactionKind
  status: TransactionStatus
}

// A categoria sozinha não serve de sinal universal: só o Nubank manda categoryId "05100000"/category
// "Credit card payment" pro pagamento de fatura — o Banco do Brasil manda categorias completamente
// diferentes pra cada canal de pagamento ("05020000 Transfer - Cash", "05060000 Transfer - Internal",
// "05090004 Third party transfer - PIX", vistas na prática), nenhuma delas exclusiva de pagamento de
// fatura. O sinal universal de verdade é `operationType === "PAGAMENTO_FATURA"` (visto em ambos os bancos,
// inclusive nas linhas "Pagamento recebido" do Nubank) — diferente do "PAGAMENTO" genérico que o Pluggy
// também manda numa compra parcelada comum (esse não serve, é ambíguo).
const CARD_PAYMENT_CATEGORY_ID = '05100000'
const CARD_PAYMENT_OPERATION_TYPE = 'PAGAMENTO_FATURA'

// CREDIT vira REFUND só em cartão de crédito (estorno de compra). Em conta de movimentação (corrente,
// benefício), CREDIT é dinheiro entrando de verdade (Pix recebido, depósito) — vira INCOME, não estorno.
export function resolveKind(tx: PluggyTransaction, isCreditCard: boolean): TransactionKind {
  if (
    tx.categoryId === CARD_PAYMENT_CATEGORY_ID ||
    tx.category?.toLowerCase() === 'credit card payment' ||
    (isCreditCard && tx.type === 'CREDIT' && tx.operationType === CARD_PAYMENT_OPERATION_TYPE)
  ) {
    return 'CARD_PAYMENT'
  }
  if (tx.type !== 'CREDIT') return 'EXPENSE'
  return isCreditCard ? 'REFUND' : 'INCOME'
}

export function mapTransaction(tx: PluggyTransaction, isCreditCard: boolean): MappedTransaction {
  const card = tx.creditCardMetadata
  return {
    externalId: tx.id,
    kind: resolveKind(tx, isCreditCard),
    status: tx.status,
    amountCents: Math.round(Math.abs(tx.amount) * 100),
    // Em parcelada, `date` é quando a parcela cai na fatura (pode ser meses à frente); purchaseDate é
    // quando a compra de fato aconteceu — é isso que conta pra "gasto do mês" (03-regras-negocio).
    occurredAt: dayFromDateString(card?.purchaseDate ?? tx.date),
    description: tx.description,
    merchant: tx.merchant?.businessName ?? null,
    cardLast4: card?.cardNumber ?? null,
    installmentNumber: card?.installmentNumber ?? null,
    installmentTotal: card?.totalInstallments ?? null,
    installmentDueAt: card?.installmentNumber != null ? dayFromDateString(tx.date) : null,
    billId: card?.billId ?? null,
  }
}

export function mapAccountFields(pluggyAccount: PluggyAccount): {
  type: AccountType
  closingDay: number | null
  dueDay: number | null
  creditLimitCents: number | null
  balanceCents: number | null
} {
  const isCreditCard = pluggyAccount.type === 'CREDIT'
  const credit = pluggyAccount.creditData
  return {
    type: isCreditCard ? 'CREDIT_CARD' : 'CHECKING',
    closingDay: isCreditCard ? dayOfMonth(credit?.balanceCloseDate) : null,
    dueDay: isCreditCard ? dayOfMonth(credit?.balanceDueDate) : null,
    creditLimitCents: isCreditCard && credit?.creditLimit != null ? Math.round(credit.creditLimit * 100) : null,
    // Cartão de crédito não usa isso pra nada (a fatura é calculada à parte) — fica null pra nunca ser
    // confundido com "quanto falta pagar".
    balanceCents: !isCreditCard && pluggyAccount.balance != null ? Math.round(pluggyAccount.balance * 100) : null,
  }
}

function dayOfMonth(dateStr: string | null | undefined): number | null {
  const match = dateStr ? /^\d{4}-(\d{2})-(\d{2})/.exec(dateStr) : null
  return match ? Number(match[2]) : null
}

// Aviso 30/7 dias antes do consentimento expirar (03-regras-negocio § Consentimento) — calculado na hora
// a cada leitura, sem job nem estado persistido (mesmo espírito do `disconnected` de 8.5: derivado, nunca
// guardado). A maioria dos bancos nunca manda consentExpiresAt (não expira), então nunca avisa. Já vencido
// continua no limiar mais urgente (7), não vira null — sem sync/checkStatus não sabemos que já venceu de
// verdade, então o aviso mais forte é o certo até confirmar.
export function reconnectWarningDays(consentExpiresAt: Date | null, now: Date): 7 | 30 | null {
  if (!consentExpiresAt) return null
  const daysLeft = Math.ceil((consentExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  if (daysLeft <= 7) return 7
  if (daysLeft <= 30) return 30
  return null
}
