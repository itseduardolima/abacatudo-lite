'use client'

import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { categoryIcon } from '@/lib/utils/category-icon'
import { useCategoriesPage } from './use-categories-page'

// Lista fixa por seed, só leitura (03-regras-negocio § Categorias e regras) — sem criar/renomear/arquivar
// pelo cliente. Mesmo padrão de linha das outras telas de Configurar (ícone + nome, sem card, divisória
// fina), o ícone é o que muda por categoria.
export default function CategoriesPage() {
  const { categories, isLoadingCategories } = useCategoriesPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Categorias</h1>
      </div>

      {isLoadingCategories && <p className="text-text">Carregando…</p>}

      {categories.length > 0 && (
        <ul className="flex flex-col">
          {categories.map((category) => {
            const Icon = categoryIcon(category.name)
            return (
              <li key={category.id} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <p className="font-semibold text-ink">{category.name}</p>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
