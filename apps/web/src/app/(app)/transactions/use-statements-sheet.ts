'use client'

import { useCallback, useState } from 'react'
import { useStatements } from '@/hooks/queries/use-statements'
import { buildWhatsappUrl, isWhatsappUrlTooLong } from '@/lib/utils/whatsapp'

export function useStatementsSheet(month: string | undefined) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedPersonId, setCopiedPersonId] = useState<string | null>(null)
  const statements = useStatements(month, isOpen)

  const close = useCallback(() => {
    setIsOpen(false)
    setCopiedPersonId(null)
  }, [])

  const send = (text: string) => {
    window.open(buildWhatsappUrl(text), '_blank', 'noopener')
  }

  const copy = async (personId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPersonId(personId)
    } catch {
      setCopiedPersonId(null)
    }
  }

  return {
    isOpen,
    open: () => setIsOpen(true),
    close,
    isLoading: statements.isPending,
    isError: statements.isError,
    statements: statements.data?.statements ?? [],
    isForecast: statements.data?.isForecast ?? false,
    copiedPersonId,
    send,
    copy: (personId: string, text: string) => void copy(personId, text),
    isTooLongForLink: isWhatsappUrlTooLong,
  }
}
