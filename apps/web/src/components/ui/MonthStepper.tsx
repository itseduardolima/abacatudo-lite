import { ChevronLeft, ChevronRight } from 'lucide-react'

// Pílula única "‹ setembro 2026 ›" pra navegar entre meses. Alvos de toque de 40px; o rótulo já vem
// formatado (quem chama decide fuso e idioma).
export function MonthStepper({
  label,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  fullWidth = false,
}: {
  label: string
  onPrevious: () => void
  onNext: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
  fullWidth?: boolean
}) {
  return (
    <div
      className={`items-center rounded-pill bg-canvas p-1 shadow-hair ${fullWidth ? 'flex w-full justify-between' : 'inline-flex'}`}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Mês anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink disabled:opacity-40"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <span className="min-w-[7rem] whitespace-nowrap text-center text-sm font-semibold capitalize text-ink">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Próximo mês"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink disabled:opacity-40"
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </div>
  )
}
