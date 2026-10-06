import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

async function clearAppCaches(): Promise<void> {
  if (!('caches' in window)) return
  const names = await caches.keys()
  await Promise.all(names.map((name) => caches.delete(name)))
}

export function useLogout() {
  return useMutation({
    // 204 sem corpo: api-client já normaliza pra `null`.
    mutationFn: async () => {
      try {
        return await apiRequest('/auth/logout', { method: 'POST', schema: z.null() })
      } finally {
        await clearAppCaches()
      }
    },
  })
}
