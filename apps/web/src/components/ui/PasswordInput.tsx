import { forwardRef, useState, type ComponentProps } from 'react'
import { Input } from './Input'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'trailingAction'>

// Mesmo campo de senha do login (mostrar/ocultar), extraído pra reusar em Meu perfil e Redefinir senha —
// três telas, um só componente em vez de reimplementar o EyeIcon cada vez.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailingAction={{
        label: visible ? 'Ocultar senha' : 'Mostrar senha',
        icon: <EyeIcon crossed={visible} />,
        onClick: () => setVisible((value) => !value),
      }}
      {...props}
    />
  )
})

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4 20 20" />}
    </svg>
  )
}
