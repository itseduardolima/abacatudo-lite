import type { AnchorHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

// Botão de ícone circular do protótipo (.ib): 44px, fundo surface, sem borda. Usado pra voltar, fechar,
// menu de opções — nunca link de texto sublinhado pra essas ações (DESIGN_SYSTEM § Mapeamento).
interface IconButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: ReactNode
}

export function IconButton({ href, children, className = '', ...rest }: IconButtonProps) {
  return (
    <Link
      href={href}
      {...rest}
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink ${className}`}
    >
      {children}
    </Link>
  )
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
