// Dinheiro é sempre centavos inteiros (04-padroes-codigo § Nomenclatura). Formata sem passar por float:
// "R$ 1.842,37" com espaço não separável (o valor nunca quebra entre "R$" e o número) e sinal de menos real.
export interface MoneyParts {
  negative: boolean
  integer: string
  cents: string
}

export function moneyParts(cents: number): MoneyParts {
  if (!Number.isInteger(cents)) throw new Error(`Dinheiro precisa ser centavos inteiros, recebi ${cents}`)
  const abs = Math.abs(cents)
  const integer = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return { negative: cents < 0, integer, cents: String(abs % 100).padStart(2, '0') }
}

export function formatMoney(cents: number): string {
  const { negative, integer, cents: c } = moneyParts(cents)
  return `${negative ? '\u2212' : ''}R$\u00a0${integer},${c}`
}

// Converte o que a pessoa digitou ("120", "120,00", "1.200,50") pra centavos \u2014 s\u00f3 transforma\u00e7\u00e3o de
// formato, nunca valida\u00e7\u00e3o de regra (04-padroes-codigo \u00a7 Formul\u00e1rios; quem valida \u00e9 a API). NaN quando
// n\u00e3o d\u00e1 pra entender o texto.
export function parseMoneyInput(value: string): number {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN
}

// Máscara "preenche da direita pra esquerda" (todo input de dinheiro do app): cada dígito digitado entra
// como centavo, os separadores (ponto de milhar, vírgula decimal) aparecem sozinhos. Só reformatação de
// texto — nunca validação (mesma regra do parseMoneyInput acima). Campo vazio continua vazio (backspace até
// limpar não vira "0,00" forçado).
export function maskMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return formatMoney(Number(digits)).replace('R$ ', '')
}
