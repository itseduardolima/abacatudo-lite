import Link from 'next/link'

// Segmentado "Cartão | Extrato" do topo da Início e do Extrato (protótipo top_seg): dois destinos, um só
// componente pra não divergir entre as telas.
export function CardStatementSwitch({
  active,
  onSurface = false,
}: {
  active: 'card' | 'statement'
  onSurface?: boolean
}) {
  const options = [
    { key: 'card', label: 'Cartão', href: '/' },
    { key: 'statement', label: 'Extrato', href: '/movements' },
  ] as const

  return (
    <div className={`inline-flex gap-1 rounded-pill p-1 ${onSurface ? 'bg-canvas' : 'bg-surface'}`}>
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={active === option.key ? 'page' : undefined}
          className={`rounded-pill px-4 py-1.5 text-sm ${
            active === option.key ? 'bg-primary font-semibold text-primary-ink' : 'text-text'
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
