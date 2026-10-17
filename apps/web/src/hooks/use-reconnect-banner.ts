import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useBankConnections } from '@/hooks/queries/use-bank-connections'
import { useReconnectBank } from '@/hooks/queries/use-reconnect-bank'
import { ApiClientError } from '@/lib/api-client'
import { PluggyConnectError } from '@/lib/pluggy-connect'

export function useReconnectBanner() {
  const router = useRouter()
  const connections = useBankConnections()
  const reconnectBank = useReconnectBank()
  const [error, setError] = useState<string | null>(null)

  const pending = (connections.data ?? []).filter((connection) => connection.needsReconnect)

  const onReconnect = async () => {
    const target = pending[0]
    if (!target) return
    setError(null)
    try {
      const id = await reconnectBank.mutateAsync(target.id)
      if (id) router.push(`/connect-bank/${id}`)
    } catch (caught) {
      if (caught instanceof ApiClientError) setError(caught.error.message)
      else if (caught instanceof PluggyConnectError) setError(caught.message)
      else throw caught
    }
  }

  return {
    count: pending.length,
    institutionName: pending[0]?.institutionName ?? null,
    onReconnect: () => void onReconnect(),
    isReconnecting: reconnectBank.isPending,
    error,
  }
}

export type ReconnectBannerState = ReturnType<typeof useReconnectBanner>
