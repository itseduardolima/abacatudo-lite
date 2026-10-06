'use client'

import { useCategories } from '@/hooks/queries/use-categories'

// Hook de página: só orquestração (04-padroes-codigo). Lista fixa por seed — sem criar/renomear/arquivar
// pelo cliente (a pedido do usuário: "vou usar esses mesmo padrão").
export function useCategoriesPage() {
  const categories = useCategories()

  return {
    categories: categories.data ?? [],
    isLoadingCategories: categories.isPending,
  }
}
