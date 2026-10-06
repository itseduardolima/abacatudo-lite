import {
  Bus,
  Fuel,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  Plane,
  Popcorn,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

// Ícone por categoria (lista fixa do seed, 03-regras-negocio § Categorias e regras) — categoria fora
// dessa lista (nome mudou, seed antigo) cai no ícone genérico, nunca quebra.
const ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  Mercado: ShoppingCart,
  'Alimentação fora': UtensilsCrossed,
  Combustível: Fuel,
  Transporte: Bus,
  Moradia: Home,
  'Contas fixas': Receipt,
  Saúde: HeartPulse,
  Lazer: Popcorn,
  Assinaturas: Repeat,
  Educação: GraduationCap,
  Compras: ShoppingBag,
  Viagem: Plane,
  Outros: MoreHorizontal,
}

export function categoryIcon(name: string): LucideIcon {
  return ICON_BY_CATEGORY[name] ?? Tag
}
