import type { ReactNode } from 'react'

// Erro de regra (ex.: credenciais inválidas) — nunca toast, ancorado acima da ação que falhou
// (DESIGN_SYSTEM § Validação). O texto é sempre a `message` que a API devolveu.
export function InlineAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="shadow-hair flex items-start gap-2 rounded-card bg-tint px-4 py-3 text-sm text-ink">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-danger">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <rect x="7.1" y="3.5" width="1.8" height="5.5" rx="0.9" fill="var(--color-surface-tint)" />
        <rect x="7.1" y="10.2" width="1.8" height="1.8" rx="0.9" fill="var(--color-surface-tint)" />
      </svg>
      <span>{children}</span>
    </div>
  )
}
