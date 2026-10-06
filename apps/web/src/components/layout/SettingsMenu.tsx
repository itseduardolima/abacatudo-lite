'use client'

import { ChevronRight, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLogout } from '@/hooks/queries/use-logout'

// Mesma lista que antes vivia solta no rodapé da Início ("Configurar") — motivo de mudar pra cá: precisa
// caber tanto no shell mobile (BottomNav) quanto no desktop (TopNav), sem duplicar o menu em cada tela.
const SETTINGS_LINKS = [
  { href: '/settings/profile', label: 'Meu perfil' },
  { href: '/settings/security', label: 'Segurança' },
  { href: '/accounts', label: 'Contas' },
  { href: '/settings/people', label: 'Pessoas' },
  { href: '/settings/categories', label: 'Categorias' },
  { href: '/settings/fixed-expenses', label: 'Gastos fixos' },
  { href: '/settings/income', label: 'Renda' },
] as const

// Mesmo padrão de bottom sheet do protótipo (04-escolher-banco: "Conectar cartão" — véu escuro + folha
// com puxador subindo da base, nunca um popover de canto). `triggerClassName` deixa o botão da engrenagem
// se comportar como qualquer outro item da nav de origem (mesmo tamanho, mesmo estado), em vez de um
// componente com visual próprio.
export function SettingsMenu({ triggerClassName }: { triggerClassName: string }) {
  const router = useRouter()
  const logout = useLogout()
  const [isOpen, setIsOpen] = useState(false)

  const onLogout = async () => {
    await logout.mutateAsync()
    setIsOpen(false)
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        aria-label="Configurar"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
      >
        <Settings size={22} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-scrim"
          />
          <div
            className="absolute inset-x-2 bottom-0 rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
          >
            <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />
            <p className="mb-1 text-lg font-bold text-ink">Configurar</p>
            {SETTINGS_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between gap-3 border-b border-surface py-3.5 text-base font-medium text-ink last:border-b-0"
              >
                {link.label}
                <ChevronRight size={20} strokeWidth={1.8} className="text-muted" />
              </Link>
            ))}
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => void onLogout()}
              className="mt-1.5 flex w-full items-center gap-3 py-3.5 text-base font-medium text-muted disabled:opacity-60"
            >
              <LogOut size={20} strokeWidth={1.8} />
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
