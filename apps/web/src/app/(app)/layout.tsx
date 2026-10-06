import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopNav } from '@/components/layout/TopNav'

// Shell responsivo (05-componentizacao § layout): TopNav a partir de `md`, BottomNav abaixo disso — cada
// uma já se esconde na outra faixa (`md:hidden` / `hidden md:flex`), nunca as duas juntas.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
      <BottomNav />
    </>
  )
}
