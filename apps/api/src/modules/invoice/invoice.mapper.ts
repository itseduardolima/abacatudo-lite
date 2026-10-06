export interface InvoiceRow {
  kind: 'EXPENSE' | 'REFUND' | 'CARD_PAYMENT'
  amountCents: number
  personId: string | null
  splits: { personId: string; amountCents: number }[]
  // Só presente pra parcela ainda sem billId. `groupKey` identifica a compra (todas as parcelas dela
  // compartilham o mesmo valor); `number` é a posição da parcela (1-based).
  installment: { groupKey: string; number: number } | null
}

export interface Invoice {
  totalCents: number
  notMineCents: number
  mineCents: number
}

// Fatura = Meu + Não é meu (03-regras-negocio § Só a minha parte). Estorno reduz o total, não é uma linha
// à parte. Split conta pra "Meu" só a fatia do self; sem split, é tudo ou nada pela pessoa da transação.
//
// CARD_PAYMENT só aparece aqui na fatura ABERTA (findOpenRows) — pagamento antecipado abate o que falta
// pagar (a pedido do usuário, achado testando ao vivo contra um Nubank real: sem isso, quem paga adiantado
// via app do banco continuava vendo o valor cheio aqui). Abate de total e de "meu" juntos — quem paga a
// própria fatura reduz o que é próprio, nunca o "não é meu" de terceiros.
export function computeInvoice(rows: InvoiceRow[], selfPersonId: string): Invoice {
  let totalCents = 0
  let mineCents = 0

  for (const row of rows) {
    if (row.kind === 'CARD_PAYMENT') {
      totalCents -= row.amountCents
      mineCents -= row.amountCents
      continue
    }

    const sign = row.kind === 'REFUND' ? -1 : 1
    totalCents += sign * row.amountCents

    if (row.splits.length > 0) {
      const selfShare = row.splits.find((split) => split.personId === selfPersonId)?.amountCents ?? 0
      mineCents += sign * selfShare
    } else if (row.personId === selfPersonId) {
      mineCents += sign * row.amountCents
    }
  }

  return { totalCents, mineCents, notMineCents: totalCents - mineCents }
}

// Uma compra parcelada gera uma Transaction por parcela (03-regras-negocio); enquanto o banco não fatura
// uma parcela, ela fica sem billId — mas TODAS as parcelas futuras também ficam sem billId até a vez
// delas chegar, não só a próxima. Sem isso, uma compra em 6x aparecia inteira (as 6 parcelas) na fatura
// aberta de hoje, quando só uma parcela vence por vez (achado ao vivo comparando com o OFX de um Nubank
// real: superestimava a fatura em milhares de reais). Mantém só a parcela de menor número por grupo —
// entre as que ainda não foram faturadas, é sempre a próxima a vencer; linha sem `installment` passa
// direto.
export function keepNextDueInstallmentOnly<T extends InvoiceRow>(rows: T[]): T[] {
  const lowestNumberByGroup = new Map<string, number>()
  for (const row of rows) {
    if (!row.installment) continue
    const current = lowestNumberByGroup.get(row.installment.groupKey)
    if (current === undefined || row.installment.number < current) {
      lowestNumberByGroup.set(row.installment.groupKey, row.installment.number)
    }
  }

  return rows.filter(
    (row) => !row.installment || row.installment.number === lowestNumberByGroup.get(row.installment.groupKey),
  )
}

// Soma a fatura de vários cartões numa só (getSummary): cada `Invoice` já respeita sua própria invariante,
// e a soma delas continua respeitando (soma de somas).
export function mergeInvoices(invoices: Invoice[]): Invoice {
  return invoices.reduce(
    (acc, invoice) => ({
      totalCents: acc.totalCents + invoice.totalCents,
      mineCents: acc.mineCents + invoice.mineCents,
      notMineCents: acc.notMineCents + invoice.notMineCents,
    }),
    { totalCents: 0, mineCents: 0, notMineCents: 0 },
  )
}

// "Quanto falta pagar" da fatura aberta (03-regras-negocio § Fatura): o banco aplica o pagamento primeiro na
// fatura fechada e só o que passa dela abate a aberta. Sobra = pagamentos desde o último fechamento menos o
// total da fatura fechada. Sem esse total (cartão sem fatura do banco e sem valor informado), não abate nada.
export function advancePaidCents(paymentsSinceClosingCents: number, closedBillCents: number | null): number {
  if (closedBillCents === null) return 0
  return Math.max(paymentsSinceClosingCents - closedBillCents, 0)
}

export function applyAdvancePayment(invoice: Invoice, advancePaid: number): Invoice {
  return {
    totalCents: invoice.totalCents - advancePaid,
    mineCents: invoice.mineCents - advancePaid,
    notMineCents: invoice.notMineCents,
  }
}
