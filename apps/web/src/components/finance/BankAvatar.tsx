import type { BankLogo } from '@gastos/shared'

// DESIGN_SYSTEM § Logos de bancos: logo sempre num avatar redondo branco com contorno hairline, nunca
// recolorido, nunca direto sobre Fog/Forest. Cópias locais em public/bancos/ (CSP img-src 'self'), nunca
// imagem do Pluggy. Sem logo escolhido, monograma (avatar Fog com iniciais) — nunca inventa qual banco é.
const LOGO_SRC: Record<BankLogo, string> = {
  nubank: '/bancos/nubank.svg',
  'banco-do-brasil': '/bancos/banco-do-brasil.svg',
  picpay: '/bancos/picpay.svg',
  infinitepay: '/bancos/infinitepay.svg',
  'mercado-pago': '/bancos/mercado-pago.svg',
  inter: '/bancos/inter.png',
}

export const BANK_LOGO_LABEL: Record<BankLogo, string> = {
  nubank: 'Nubank',
  'banco-do-brasil': 'Banco do Brasil',
  picpay: 'PicPay',
  infinitepay: 'InfinitePay',
  'mercado-pago': 'Mercado Pago',
  inter: 'Inter',
}

const LOGO_SCALE: Record<BankLogo, number> = {
  nubank: 0.58,
  'banco-do-brasil': 0.58,
  picpay: 0.5,
  infinitepay: 0.58,
  'mercado-pago': 0.62,
  inter: 0.64,
}

export function BankAvatar({
  bankLogo,
  fallbackInitial,
  size,
}: {
  bankLogo: BankLogo | null
  fallbackInitial: string
  size: number
}) {
  if (bankLogo) {
    // PicPay é mais largo (o "P" com o quadrado) — cabe menor que os outros dois pra não estourar o
    // círculo (DESIGN_SYSTEM § Logos de bancos).
    const logoSize = Math.round(size * LOGO_SCALE[bankLogo])
    return (
      <span
        className="flex flex-shrink-0 items-center justify-center rounded-full bg-canvas shadow-hair"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, sem otimização de imagem envolvida */}
        <img
          src={LOGO_SRC[bankLogo]}
          alt={BANK_LOGO_LABEL[bankLogo]}
          width={logoSize}
          height={logoSize}
          className="object-contain"
        />
      </span>
    )
  }

  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-surface font-bold text-ink"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {fallbackInitial}
    </span>
  )
}
