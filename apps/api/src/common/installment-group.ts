import { monthKey } from './date/timezone'

// Fonte única da chave de agrupamento de parcela — usada tanto pelo cálculo da fatura
// (InvoiceRepository/invoice.mapper.ts) quanto pela lista de lançamentos (TransactionRepository). Nunca
// duplicar essa conta em outro lugar: as duas já divergiram uma vez (achado ao vivo comparando com o OFX
// de um Nubank real) e é fácil voltar a acontecer.
// Nome da compra sem o marcador da parcela. O texto da parcela é único por linha e cada banco escreve de um
// jeito: "Compra 2/6" (Nubank, no fim) ou "RAMSONS STUDI PARC 05/12 MANAUS      BR" (BB, no meio, com a
// cidade depois). Tira o marcador "N/M" da PRÓPRIA parcela (com "PARC" antes, se houver), em qualquer
// posição, e junta os espaços. Serve pro agrupamento e pro nome exibido (sem "PARC 05/12" do lado do "5/12").
export function installmentBaseName(row: {
  description: string
  installmentTotal: number
  installmentNumber?: number | null
}): string {
  const collapsed = row.description.replace(/\s+/g, ' ').trim()
  const marker =
    row.installmentNumber == null
      ? /\s*(?:PARC(?:ELA)?\.?\s*)?\d+\s*\/\s*\d+\s*$/i
      : new RegExp(
          `\\s*(?:PARC(?:ELA)?\\.?\\s*)?(?<!\\d)0*${row.installmentNumber}\\s*/\\s*0*${row.installmentTotal}(?!\\d)`,
          'i',
        )
  return collapsed.replace(marker, '').replace(/\s+/g, ' ').trim()
}

export function installmentGroupKey(row: {
  description: string
  occurredAt: Date
  installmentTotal: number
  installmentNumber?: number | null
}): string {
  // A data da compra também varia de uma parcela pra outra no BB (17 e 18/02 na mesma compra), então o
  // agrupamento usa só o MÊS da compra, mais o total de parcelas (evita juntar duas compras diferentes do
  // mesmo nome).
  const base = installmentBaseName(row)
    .replace(/\s*"[^"]*"$/, '')
    .toLowerCase()
  return `${base}|${monthKey(row.occurredAt)}|${row.installmentTotal}`
}

interface InstallmentRow {
  billId: string | null
  description: string
  occurredAt: Date
  installmentNumber: number | null
  installmentTotal: number | null
}

// Mesmo achado do cálculo da fatura: enquanto uma compra parcelada não é faturada (billId null), TODAS as
// parcelas futuras dela também ficam sem billId, não só a próxima — então uma compra em 3x aparecia
// inteira na lista de lançamentos, quando só uma parcela vence por vez. Linha já faturada (billId
// preenchido) sempre passa — cada fatura fechada tem sua própria parcela, sem ambiguidade nenhuma.
export function keepCurrentInstallmentsOnly<T extends InstallmentRow>(rows: T[]): T[] {
  const lowestNumberByGroup = new Map<string, number>()
  for (const row of rows) {
    if (row.billId !== null || row.installmentNumber == null || row.installmentTotal == null) continue
    const key = installmentGroupKey({
      description: row.description,
      occurredAt: row.occurredAt,
      installmentTotal: row.installmentTotal,
      installmentNumber: row.installmentNumber,
    })
    const current = lowestNumberByGroup.get(key)
    if (current === undefined || row.installmentNumber < current) lowestNumberByGroup.set(key, row.installmentNumber)
  }

  return rows.filter((row) => {
    if (row.billId !== null || row.installmentNumber == null || row.installmentTotal == null) return true
    const key = installmentGroupKey({
      description: row.description,
      occurredAt: row.occurredAt,
      installmentTotal: row.installmentTotal,
      installmentNumber: row.installmentNumber,
    })
    return row.installmentNumber === lowestNumberByGroup.get(key)
  })
}
