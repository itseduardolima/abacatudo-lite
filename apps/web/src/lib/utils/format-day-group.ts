// Rótulo de agrupamento por dia da fatura (DESIGN_SYSTEM, protótipo 08-fatura), sempre em
// America/Manaus — nunca no fuso do navegador.
const TIME_ZONE = 'America/Manaus'
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
const labelFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function dayGroupLabel(isoDate: string): string {
  const date = new Date(isoDate)
  const todayKey = dayKeyFormatter.format(new Date())
  const dateKey = dayKeyFormatter.format(date)
  if (dateKey === todayKey) return 'Hoje'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateKey === dayKeyFormatter.format(yesterday)) return 'Ontem'

  return labelFormatter.format(date).replace('.', '')
}
