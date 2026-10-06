// Mesma normalização na criação da regra e na hora de casar contra uma transação — sem isso "Loja X" e
// "loja x " nunca combinam.
export function normalizeMerchant(value: string): string {
  return value.trim().toLowerCase()
}
