import { moneyParts } from '@/lib/utils/format-money'

interface MoneyTextProps {
  cents: number
  className?: string
}

// Única forma de mostrar dinheiro na UI: recebe centavos inteiros (já calculados pela API), tabular-nums,
// centavos menores. Nunca toFixed solto em componente (05-componentizacao § MoneyText).
export function MoneyText({ cents, className = '' }: MoneyTextProps) {
  const { negative, integer, cents: c } = moneyParts(cents)
  return (
    <span className={`whitespace-nowrap font-semibold tabular-nums text-ink ${className}`}>
      {negative ? '\u2212' : ''}R$&nbsp;{integer}
      <span className="text-[0.82em] font-medium">,{c}</span>
    </span>
  )
}
