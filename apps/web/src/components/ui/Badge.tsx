import type { ReactNode } from 'react'

// Badge do design system: pílula 12px 500, tint + primary-ink (DESIGN_SYSTEM § Mapeamento de componente).
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-tint px-3 py-1 text-xs font-medium text-primary-ink">
      {children}
    </span>
  )
}
