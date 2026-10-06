// Lockup: mascote + nome (DESIGN_SYSTEM § Marca). Só sobre fundo claro; mínimo de 56px de altura.
export function Logo({ height = 56 }: { height?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático próprio, sem otimização de imagem */}
      <img src="/brand/abacatudo-logo.svg" alt="" width={Math.round((height * 3260) / 3960)} height={height} />
      <span className="display-number text-[1.75rem] text-inverse">AbacaTudo</span>
    </span>
  )
}
