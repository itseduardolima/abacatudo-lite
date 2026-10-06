// Cor do avatar por pessoa (protótipo 08-fatura: self sempre lima, as demais giram entre as cores de
// acento do design system pra não repetir con a mesma pessoa perto). isSelf nunca muda de cor.
const OTHERS_ROTATION = ['bg-inverse-2 text-on-inverse', 'bg-accent text-on-inverse', 'bg-muted text-ink']

export function personAvatarClass(isSelf: boolean, othersIndex: number): string {
  if (isSelf) return 'bg-primary text-primary-ink'
  const index = ((othersIndex % OTHERS_ROTATION.length) + OTHERS_ROTATION.length) % OTHERS_ROTATION.length
  return OTHERS_ROTATION[index]!
}

export function personInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}
