'use client'

import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'

const POINTS = [
  {
    title: 'O app só lê',
    body: 'Ele nunca movimenta dinheiro nem faz pagamentos.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3.5 19.5 6v6c0 4.6-3.2 7.6-7.5 8.5C7.7 19.6 4.5 16.6 4.5 12V6z" />
        <path d="m9 12 2.2 2.2L15.5 10" />
      </svg>
    ),
  },
  {
    title: 'Sua senha fica com o banco',
    body: 'Você entra direto no site do banco. O AbacaTudo não vê a senha.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </svg>
    ),
  },
  {
    title: 'Pix e débito ficam no Extrato',
    body: 'Aparecem lá para consulta, mas não entram no orçamento.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
]

// Home sem cartão conectado (protótipo 03-inicio-vazio). "Importar fatura em CSV ou OFX" ficou de fora
// de propósito — 3.1 foi pulada a pedido do usuário (fonte de dado é a API do Pluggy direto).
export function ConnectBankCard({
  onConnect,
  isConnecting,
  error,
}: {
  onConnect: () => void
  isConnecting: boolean
  error: string | null
}) {
  return (
    <div>
      <div className="rounded-card-lg bg-inverse px-6 py-7 text-on-inverse">
        <h1 className="text-[2.1rem] font-bold leading-tight text-on-inverse-accent">Traga a fatura do seu cartão.</h1>
        <p className="mt-3.5 text-on-inverse">
          Com ela, o app separa o que é seu do que é da família e calcula o orçamento. Débito e Pix ficam à parte, no
          Extrato.
        </p>
        <div className="mt-6 flex flex-col items-start gap-4">
          {error && <InlineAlert>{error}</InlineAlert>}
          <Button className="w-full" state={isConnecting ? 'loading' : 'idle'} onClick={onConnect}>
            Conectar pelo banco
          </Button>
        </div>
      </div>

      <div className="mt-3">
        {POINTS.map((point, index) => (
          <div key={point.title}>
            {index > 0 && <div className="h-px bg-surface" />}
            <div className="flex gap-3.5 py-3.5">
              <span className="pt-0.5 text-text">{point.icon}</span>
              <div>
                <p className="font-bold text-ink">{point.title}</p>
                <p className="mt-0.5 text-sm text-muted">{point.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
