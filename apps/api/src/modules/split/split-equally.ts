// Dinheiro nunca é calculado no frontend (04-padroes-codigo): "dividir igualmente" é sempre a API. O
// resto de centavos vai pros primeiros da lista, de forma determinística (03-regras-negocio).
export function splitEqually(totalCents: number, personIds: string[]): { personId: string; amountCents: number }[] {
  const base = Math.floor(totalCents / personIds.length)
  const remainder = totalCents - base * personIds.length
  return personIds.map((personId, index) => ({
    personId,
    amountCents: base + (index < remainder ? 1 : 0),
  }))
}
