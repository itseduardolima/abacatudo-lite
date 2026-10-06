// Dia do produto é sempre em America/Manaus (03-regras-negocio, 04-padroes-codigo) — nunca no fuso do
// navegador de quem está olhando.
const FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Manaus',
  day: '2-digit',
  month: '2-digit',
})

export function formatShortDate(isoDate: string): string {
  return FORMATTER.format(new Date(isoDate))
}

const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Manaus',
  hour: '2-digit',
  minute: '2-digit',
})

// "08:14" — hora do dia em America/Manaus (extrato, protótipo 19-extrato).
export function formatTime(isoDateTime: string): string {
  return TIME_FORMATTER.format(new Date(isoDateTime))
}

// "Atualizado" de um sync (8.6) — nunca inventa validade/vencimento que a API não manda (03-regras-negocio),
// só diz há quanto tempo o dado é fresco. "hoje" compara pelo dia do produto, não pelas últimas 24h.
export function formatSyncedAt(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  const time = TIME_FORMATTER.format(date)
  const isToday = formatShortDate(isoDateTime) === formatShortDate(new Date().toISOString())
  return isToday ? `hoje às ${time}` : `${formatShortDate(isoDateTime)} às ${time}`
}

// "qui 17 set, 19:41" (protótipo 12-detalhe § Data) — dia da semana curto, sem ponto.
const WEEKDAY_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Manaus',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function formatDateTimeLong(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  const weekdayDate = WEEKDAY_DATE_FORMATTER.format(date).replace(/\./g, '')
  return `${weekdayDate}, ${TIME_FORMATTER.format(date)}`
}
