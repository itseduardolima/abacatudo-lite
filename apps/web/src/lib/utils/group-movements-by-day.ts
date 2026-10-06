import type { Transaction } from '@gastos/shared'
import { dayGroupLabel } from './format-day-group'

export function groupMovementsByDay(movements: Transaction[]): { label: string; items: Transaction[] }[] {
  const groups: { label: string; items: Transaction[] }[] = []
  for (const movement of movements) {
    const label = dayGroupLabel(movement.occurredAt)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(movement)
    else groups.push({ label, items: [movement] })
  }
  return groups
}
