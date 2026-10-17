import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'

interface ReconnectBannerProps {
  count: number
  institutionName: string | null
  onReconnect: () => void
  isReconnecting: boolean
  error: string | null
}

export function ReconnectBanner({ count, institutionName, onReconnect, isReconnecting, error }: ReconnectBannerProps) {
  if (count === 0) return null
  const subject = count === 1 ? `Sua conexão com ${institutionName}` : `${count} conexões com o banco`
  const verb = count === 1 ? 'parou' : 'pararam'

  return (
    <section className="shadow-hair flex flex-col gap-3 rounded-card bg-tint px-4 py-4" aria-label="Reconectar banco">
      <div>
        <p className="font-bold text-ink">Reconecte para voltar a atualizar</p>
        <p className="mt-1 text-sm text-text">
          {subject} {verb} de atualizar, então os gastos novos não estão chegando. O que já foi importado continua aqui.
        </p>
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <Button type="button" size="sm" state={isReconnecting ? 'loading' : 'idle'} onClick={onReconnect}>
        Reconectar
      </Button>
    </section>
  )
}
