'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForecastMonth } from '@/hooks/use-forecast-month'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useBudgetPace } from '@/hooks/queries/use-budget-pace'
import { useConnectBank } from '@/hooks/queries/use-connect-bank'
import { useInvoices } from '@/hooks/queries/use-invoice'
import { useMe } from '@/hooks/queries/use-me'
import { ApiClientError } from '@/lib/api-client'
import { latestForecastMonth } from '@/lib/utils/latest-forecast-month'

export function useHomePage() {
  const router = useRouter()
  const me = useMe()
  const accounts = useAccounts()
  const connectBank = useConnectBank()
  const [connectError, setConnectError] = useState<string | null>(null)

  // O middleware só olha se o cookie existe, nunca se a sessão ainda é válida — quem confirma de verdade
  // é a API. Cookie velho (revogado, expirado) vira 401 aqui, e manda pro login em vez de mostrar a tela
  // quebrada (visto ao vivo: sem isso, ficava "Olá, undefined").
  useEffect(() => {
    if (me.isError) router.replace('/login')
  }, [me.isError, router])

  const cardAccounts = (accounts.data ?? []).filter((account) => account.type === 'CREDIT_CARD' && !account.archivedAt)

  const currentInvoices = useInvoices(cardAccounts.map((account) => account.id))
  const forecast = useForecastMonth(latestForecastMonth(currentInvoices.map((query) => query.data?.lastForecastMonth)))
  const invoiceMonth = forecast.isForecast ? forecast.month : undefined
  const pace = useBudgetPace(invoiceMonth)
  const monthInvoices = useInvoices(
    cardAccounts.map((account) => account.id),
    invoiceMonth,
  )

  // Abre o widget do Pluggy numa aba nova (é lá que a lista de bancos e o login de verdade acontecem —
  // nunca dentro do nosso app) e leva pra tela de "conectando", que faz o polling do status.
  const onConnectBank = async () => {
    setConnectError(null)
    try {
      const { id, authorizeUrl } = await connectBank.mutateAsync()
      window.open(authorizeUrl, '_blank', 'noopener')
      router.push(`/connect-bank/${id}`)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setConnectError(error.error.message)
    }
  }

  return {
    isLoadingMe: me.isPending || me.isError,
    pace: pace.data,
    isLoadingPace: pace.isPending,
    cardAccounts,
    invoiceByAccountId: new Map(
      cardAccounts.map((account, index) => [account.id, monthInvoices[index]?.data] as const),
    ),
    forecast,
    isLoadingAccounts: accounts.isPending,
    onConnectBank,
    isConnectingBank: connectBank.isPending,
    connectError,
  }
}
