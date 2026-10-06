'use client'

import { BarChart3, Home, Receipt } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SettingsMenu } from './SettingsMenu'

// Barra flutuante do protótipo (08-fatura .nav): pílula com 16px de margem, só o item ativo mostra
// rótulo (dentro de uma pílula lima); os outros são só o ícone. Nav de verdade é Início/Fatura/
// Relatórios/Configurar (05-componentizacao § layout) — "Fatura" aponta pra /transactions (onde a
// correção de categoria/pessoa já existe) até existir a tela dedicada do protótipo (09-classificar).
// "Orçamento" (alvo) saiu: nunca teve tela, só ocupava espaço; Configurar (engrenagem) é o item novo,
// abre o menu que antes vivia solto no rodapé da Início. Ícones: lucide-react (traço fino, mesma família
// visual do protótipo) em vez de SVG desenhado à mão por ícone.
const LINKS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/transactions', label: 'Fatura', icon: Receipt },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex h-16 max-w-[388px] items-center gap-1 rounded-pill bg-surface p-2 shadow-hair md:hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === '/' ? pathname === '/' || pathname.startsWith('/movements') : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'flex h-12 flex-none items-center gap-2 rounded-pill bg-primary px-[18px] text-sm font-semibold text-primary-ink'
                : 'flex h-12 flex-1 items-center justify-center rounded-pill text-text'
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            {isActive && label}
          </Link>
        )
      })}
      <SettingsMenu triggerClassName="flex h-12 flex-1 items-center justify-center rounded-pill text-text" />
    </nav>
  )
}
