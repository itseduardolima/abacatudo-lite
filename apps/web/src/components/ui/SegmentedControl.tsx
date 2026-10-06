// Controle segmentado de escolha única, largura total, opções de tamanho igual. A opção ativa é lima só
// como fundo (DESIGN_SYSTEM: lima nunca como texto).
interface SegmentedControlProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-pill bg-canvas p-1 shadow-hair">
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-pill text-sm font-semibold ${
              isActive ? 'bg-primary text-primary-ink' : 'text-text'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
