import type { Account } from '@gastos/shared'

// Chips de conta com rolagem horizontal (uma linha, sem dropdown). Só aparece com mais de uma conta —
// com uma só, filtrar não muda nada.
export function AccountFilter({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[]
  value: string
  onChange: (accountId: string) => void
}) {
  if (accounts.length < 2) return null

  const options = [{ id: '', name: 'Todas' }, ...accounts.map((account) => ({ id: account.id, name: account.name }))]

  return (
    <div role="radiogroup" aria-label="Conta" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {options.map((option) => {
        const isActive = option.id === value
        return (
          <button
            key={option.id || 'all'}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.id)}
            className={`h-9 max-w-[12rem] flex-shrink-0 truncate rounded-pill px-4 text-sm font-medium ${
              isActive ? 'bg-inverse text-on-inverse' : 'bg-canvas text-ink shadow-hair'
            }`}
          >
            {option.name}
          </button>
        )
      })}
    </div>
  )
}
