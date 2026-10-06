'use client'

import { CardInvoiceRow } from './card-invoice-row'
import { ConnectBankCard } from './connect-bank-card'
import { HeroCarousel } from './hero-carousel'
import { PaceHeroCard } from './pace-hero-card'
import { useHomePage } from './use-home-page'
import { CardStatementSwitch } from '@/components/layout/CardStatementSwitch'
import { Logo } from '@/components/ui/Logo'
import { MonthStepper } from '@/components/ui/MonthStepper'
import { formatMonthName } from '@/lib/utils/format-month'

// Home fiel ao protótipo: sem cartão conectado mostra o convite pra conectar (03-inicio-vazio); com
// cartão, o hero de ritmo (HU 7.4, `/budget/pace`) + faturas do mês (`/invoice` por cartão) do 07-inicio.
// Segmentado "Cartão | Extrato" no topo: o Extrato (movimentações, 5.2) fica em `/movements`.
export default function HomePage() {
  const {
    isLoadingMe,
    pace,
    isLoadingPace,
    cardAccounts,
    invoiceByAccountId,
    forecast,
    isLoadingAccounts,
    onConnectBank,
    isConnectingBank,
    connectError,
  } = useHomePage()
  const hasNoCard = !isLoadingAccounts && cardAccounts.length === 0

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center justify-between">
        <CardStatementSwitch active="card" />
        <Logo height={32} />
      </div>

      {isLoadingMe && <p className="text-text">Carregando…</p>}

      {hasNoCard && (
        <ConnectBankCard onConnect={() => void onConnectBank()} isConnecting={isConnectingBank} error={connectError} />
      )}

      {!isLoadingMe && !hasNoCard && !isLoadingPace && pace && (
        <HeroCarousel cards={[{ key: 'pace', content: <PaceHeroCard pace={pace} /> }]} />
      )}

      {!isLoadingAccounts && cardAccounts.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">{forecast.isForecast ? 'Faturas previstas' : 'Faturas'}</h2>
            <MonthStepper
              label={formatMonthName(forecast.month)}
              onPrevious={forecast.goToPreviousMonth}
              onNext={forecast.goToNextMonth}
              canGoPrevious={forecast.canGoPrevious}
              canGoNext={forecast.canGoNext}
            />
          </div>
          {forecast.isForecast && <p className="mt-2 text-xs text-muted">Parcelas lançadas pelo banco e estimadas.</p>}
          <div className="mt-1">
            {cardAccounts.map((account) => (
              <CardInvoiceRow
                key={account.id}
                account={account}
                invoice={invoiceByAccountId.get(account.id)}
                month={forecast.isForecast ? forecast.month : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
