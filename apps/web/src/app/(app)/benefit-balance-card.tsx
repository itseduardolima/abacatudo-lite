import Link from 'next/link'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatSyncedAt } from '@/lib/utils/format-date'

// Segundo item do carrossel do hero (Fase 4) — saldo real da conta de benefício (InfinitePay via Pluggy),
// só existe quando o usuário marcou uma conta em /accounts. Mesmo tratamento visual do card de ritmo
// (bg-inverse): são dois jeitos de olhar dinheiro do mês, não conteúdos diferentes. Sem data de validade
// aqui — o Pluggy não manda isso pra conta corrente, e o app nunca inventa número (03-regras-negocio); o
// que dá pra mostrar de verdade é a hora do último sync, pra saber se o saldo é fresco.
export function BenefitBalanceCard({
  accountName,
  cents,
  syncedAt,
}: {
  accountName: string | null
  cents: number
  syncedAt: string | null
}) {
  return (
    <Link href="/movements/benefit" className="block h-full" aria-label="Abrir extrato e resumo do benefício">
      <BenefitBalanceCardBody accountName={accountName} cents={cents} syncedAt={syncedAt} />
    </Link>
  )
}

function BenefitBalanceCardBody({
  accountName,
  cents,
  syncedAt,
}: {
  accountName: string | null
  cents: number
  syncedAt: string | null
}) {
  return (
    // h-full (não min-h com valor chutado): o carrossel já estica os dois itens pra mesma altura (flex
    // row, align-items padrão stretch) — o card de ritmo é quem decide a altura de verdade, quantos
    // campos ele tiver. justify-between distribui o que já é real (saldo no topo, sync embaixo) em vez de
    // inventar mais uma linha só pra preencher espaço.
    <div className="flex h-full flex-col justify-between rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <div>
        <p className="text-xs text-on-inverse-muted">Saldo de benefício</p>
        <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
          <MoneyText cents={cents} className="!text-on-inverse-accent" />
        </p>
        {accountName && <p className="mt-2 text-xs text-on-inverse-muted">{accountName}</p>}
      </div>
      {syncedAt && <p className="text-xs text-on-inverse-muted">Atualizado {formatSyncedAt(syncedAt)}</p>}
    </div>
  )
}
