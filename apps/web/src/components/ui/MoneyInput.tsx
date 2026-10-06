import { forwardRef, type ComponentProps } from 'react'
import { Input } from './Input'
import { maskMoneyInput } from '@/lib/utils/format-money'

type MoneyInputProps = Omit<ComponentProps<typeof Input>, 'inputMode' | 'placeholder'>

// Todo campo de dinheiro do app passa por aqui: reformata a cada tecla (maskMoneyInput), nunca deixa o
// campo aceitar texto solto que só vira erro depois de submeter. Continua um Input comum pra quem usa —
// mesmo label/error/register do react-hook-form, só o onChange é interceptado.
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { onChange, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      inputMode="decimal"
      placeholder="0,00"
      {...rest}
      onChange={(event) => {
        event.target.value = maskMoneyInput(event.target.value)
        onChange?.(event)
      }}
    />
  )
})
