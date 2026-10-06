import { useState } from 'react'
import { currentMonthKey, shiftMonthKey } from '@/lib/utils/format-month'

// Mês selecionado ("AAAA-MM", começa no mês de agora em America/Manaus) + setas pra navegar. Compartilhado
// pelas telas com seletor de mês (Extrato, Relatórios).
export function useMonthNavigation() {
  const [month, setMonth] = useState(currentMonthKey)
  return {
    month,
    goToPreviousMonth: () => setMonth((current) => shiftMonthKey(current, -1)),
    goToNextMonth: () => setMonth((current) => shiftMonthKey(current, 1)),
  }
}
