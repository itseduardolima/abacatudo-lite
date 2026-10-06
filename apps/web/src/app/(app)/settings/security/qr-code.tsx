'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [value])

  if (!dataUrl) return <div className="h-[220px] w-[220px] animate-pulse rounded-card bg-surface" />
  // eslint-disable-next-line @next/next/no-img-element -- data: URI gerado no cliente, next/image não serve pra isso
  return <img src={dataUrl} alt="QR code do 2FA" width={220} height={220} className="rounded-card" />
}
