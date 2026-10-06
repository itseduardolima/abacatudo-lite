import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outline' | 'link'
type Size = 'md' | 'sm'
export type ButtonState = 'idle' | 'loading'

// Lima só como FUNDO de ação primária (1,5:1 no branco: nunca texto). Um botão preenchido + um link,
// nunca dois preenchidos lado a lado (DESIGN_SYSTEM § Mapeamento de componente).
const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink',
  outline: 'bg-canvas text-border-strong shadow-[inset_0_0_0_1px_var(--color-border-strong)]',
  link: 'text-border-strong underline underline-offset-4',
}
const sizeClass: Record<Size, string> = {
  md: 'min-h-control px-6 text-base',
  sm: 'h-[34px] px-4 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  state?: ButtonState
}

// state="loading": desabilita enquanto a API responde (a validação é sempre da API; o botão só espera).
export function Button({
  variant = 'primary',
  size = 'md',
  state = 'idle',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isLoading = state === 'loading'
  const shape = variant === 'link' ? 'font-medium' : `rounded-pill ${sizeClass[size]}`
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-body font-medium transition-opacity disabled:opacity-60 ${shape} ${variantClass[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
