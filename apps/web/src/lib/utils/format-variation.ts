// Variação percentual já calculada pela API ("+23%", "−13%", "igual"). `null` = sem base de comparação
// (mês/média zerada): nunca mostra um número inventado.
export function formatVariation(percent: number | null): string | null {
  if (percent === null) return null
  if (percent === 0) return 'igual'
  return percent > 0 ? `+${percent}%` : `−${Math.abs(percent)}%`
}
