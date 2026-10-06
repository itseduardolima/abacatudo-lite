'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SettingsMenu } from './SettingsMenu'
import { Logo } from '@/components/ui/Logo'

// Shell de desktop (docs/specs/05-componentizacao.md: "um único código, muda só o shell" — barra
// superior, sem sidebar). Espelha os mesmos destinos da `BottomNav` do celular (protótipo `d03-fatura`
// .dnav), só que sempre com o rótulo visível (tem espaço de sobra). Visível só a partir de `md`;
// `BottomNav` cobre o `md:hidden`.
const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/transactions', label: 'Fatura' },
  { href: '/reports', label: 'Relatórios' },
] as const

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-10 hidden h-[72px] items-center gap-8 border-b border-border bg-canvas px-8 md:flex">
      <Logo height={28} />
      <div className="flex flex-1 items-center justify-center gap-1 rounded-pill bg-surface p-1">
        {LINKS.map(({ href, label }) => {
          const isActive =
            href === '/' ? pathname === '/' || pathname.startsWith('/movements') : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
                isActive ? 'bg-inverse text-on-inverse' : 'text-text'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
      <SettingsMenu triggerClassName="flex h-9 w-9 items-center justify-center rounded-full text-text" />
    </nav>
  )
}
