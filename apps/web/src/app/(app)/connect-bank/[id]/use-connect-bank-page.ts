'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CreatePersonInput } from '@gastos/shared'
import { useQueryClient } from '@tanstack/react-query'
import { ACCOUNTS_QUERY_KEY } from '@/hooks/queries/use-accounts'
import { useArchivePerson } from '@/hooks/queries/use-archive-person'
import { useBankConnectionStatus } from '@/hooks/queries/use-bank-connection-status'
import { useCreatePerson } from '@/hooks/queries/use-create-person'
import { usePeople } from '@/hooks/queries/use-people'
import { ApiClientError } from '@/lib/api-client'

const ERROR_STATUSES = new Set(['LOGIN_ERROR', 'OUTDATED', 'ERROR'])

// Hook de página: só orquestração (04-padroes-codigo). Duas etapas em uma rota (protótipo 05-lendo +
// 06-pessoas): enquanto o status não chega em UPDATED/erro, mostra "lendo"; assim que sincroniza,
// invalida as queries que dependem de conta/transação (a Home tava mostrando "sem cartão") e passa pro
// passo de pessoas.
export function useConnectBankPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const status = useBankConnectionStatus(params.id)
  const people = usePeople()
  const createPerson = useCreatePerson()
  const archivePerson = useArchivePerson()
  const [step, setStep] = useState<'connecting' | 'people'>('connecting')
  const [ruleError, setRuleError] = useState<string | null>(null)
  const invalidatedRef = useRef(false)

  const isError = status.data ? ERROR_STATUSES.has(status.data.status) : false

  useEffect(() => {
    if (status.data?.status === 'UPDATED' && !invalidatedRef.current) {
      invalidatedRef.current = true
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
      setStep('people')
    }
  }, [status.data?.status, queryClient])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreatePersonInput>({ defaultValues: { name: '' } })

  const onAddPerson = handleSubmit(async (values) => {
    setRuleError(null)
    try {
      await createPerson.mutateAsync(values)
      reset()
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) setError('name', { message: fieldErrors.name[0] })
      else setRuleError(error.error.message)
    }
  })

  const finish = () => router.push('/')

  return {
    connectionStatus: status.data?.status,
    isError,
    step,
    people: people.data ?? [],
    register,
    errors,
    onAddPerson,
    isAddingPerson: createPerson.isPending,
    ruleError,
    archivePerson: (id: string) => archivePerson.mutate(id),
    archivingId: archivePerson.isPending ? archivePerson.variables : undefined,
    finish,
  }
}
