export function splitProportionally(
  totalCents: number,
  shares: { personId: string; amountCents: number }[],
): { personId: string; amountCents: number }[] {
  const weightSum = shares.reduce((sum, share) => sum + share.amountCents, 0)
  const parts = shares.map((share) => ({
    personId: share.personId,
    amountCents: Math.floor((totalCents * share.amountCents) / weightSum),
  }))
  const remainder = totalCents - parts.reduce((sum, part) => sum + part.amountCents, 0)
  return parts.map((part, index) => ({ ...part, amountCents: part.amountCents + (index < remainder ? 1 : 0) }))
}
