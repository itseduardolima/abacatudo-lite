import type { InvoiceRow } from './invoice.mapper'

export interface StatementRow extends InvoiceRow {
  label: string
  installmentNumber: number | null
  installmentTotal: number | null
  sortAt: Date
  estimated?: boolean
}

export interface StatementCardInput {
  accountId: string
  accountName: string
  dueDay: number | null
  rows: StatementRow[]
}

export interface StatementPerson {
  id: string
  name: string
  isSelf: boolean
}

export interface StatementLine {
  label: string
  amountCents: number
  installmentNumber: number | null
  installmentTotal: number | null
  estimated: boolean
}

export interface CardStatement {
  accountId: string
  accountName: string
  dueDay: number | null
  lines: StatementLine[]
}

export interface PersonStatement {
  personId: string
  personName: string
  totalCents: number
  cards: CardStatement[]
}

export function buildPersonStatements(cards: StatementCardInput[], people: StatementPerson[]): PersonStatement[] {
  const others = new Map(people.filter((person) => !person.isSelf).map((person) => [person.id, person]))
  const byPerson = new Map<string, Map<string, { card: CardStatement; sortAts: Map<StatementLine, Date> }>>()

  for (const card of cards) {
    for (const row of card.rows) {
      if (row.kind === 'CARD_PAYMENT') continue
      const sign = row.kind === 'REFUND' ? -1 : 1
      const shares =
        row.splits.length > 0
          ? row.splits
          : row.personId
            ? [{ personId: row.personId, amountCents: row.amountCents }]
            : []

      for (const share of shares) {
        if (!others.has(share.personId)) continue
        const perCard = byPerson.get(share.personId) ?? new Map()
        byPerson.set(share.personId, perCard)
        const entry = perCard.get(card.accountId) ?? {
          card: { accountId: card.accountId, accountName: card.accountName, dueDay: card.dueDay, lines: [] },
          sortAts: new Map<StatementLine, Date>(),
        }
        perCard.set(card.accountId, entry)
        const line: StatementLine = {
          label: row.label,
          amountCents: sign * share.amountCents,
          installmentNumber: row.installmentNumber,
          installmentTotal: row.installmentTotal,
          estimated: row.estimated ?? false,
        }
        entry.card.lines.push(line)
        entry.sortAts.set(line, row.sortAt)
      }
    }
  }

  const statements: PersonStatement[] = []
  for (const [personId, perCard] of byPerson) {
    const orderedCards = cards
      .map((card) => perCard.get(card.accountId))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
      .map((entry) => ({
        ...entry.card,
        lines: [...entry.card.lines].sort(
          (a, b) =>
            (entry.sortAts.get(a)?.getTime() ?? 0) - (entry.sortAts.get(b)?.getTime() ?? 0) ||
            a.label.localeCompare(b.label, 'pt-BR'),
        ),
      }))
    const totalCents = orderedCards.reduce(
      (sum, card) => sum + card.lines.reduce((cardSum, line) => cardSum + line.amountCents, 0),
      0,
    )
    if (totalCents <= 0) continue
    statements.push({ personId, personName: others.get(personId)?.name ?? '', totalCents, cards: orderedCards })
  }

  return statements.sort((a, b) => a.personName.localeCompare(b.personName, 'pt-BR'))
}

export function formatBrl(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const reais = Math.trunc(absolute / 100).toLocaleString('pt-BR')
  const centavos = String(absolute % 100).padStart(2, '0')
  return `${sign}R$ ${reais},${centavos}`
}

function monthName(monthKeyValue: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(`${monthKeyValue}-15T12:00:00.000Z`),
  )
}

function formatLine(line: StatementLine): string {
  const base = `${line.label}: ${formatBrl(line.amountCents)}`
  if (line.installmentNumber == null || line.installmentTotal == null) return base
  const last = line.installmentNumber === line.installmentTotal ? ' - última' : ''
  const estimated = line.estimated ? ' - estimada' : ''
  return `${base} (${line.installmentNumber}/${line.installmentTotal}${last}${estimated})`
}

export function formatStatementText(statement: PersonStatement, monthKeyValue: string, isForecast: boolean): string {
  const showCardName = statement.cards.length > 1
  const sections = statement.cards.map((card) =>
    [
      ...(showCardName ? [card.accountName] : []),
      ...card.lines.map(formatLine),
      ...(card.dueDay ? [`Pagar até dia ${card.dueDay}`] : []),
    ].join('\n'),
  )

  return [
    `Sua conta de ${monthName(monthKeyValue)}${isForecast ? ' (previsão)' : ''}`,
    ...sections,
    `Total: ${formatBrl(statement.totalCents)}`,
  ].join('\n\n')
}
