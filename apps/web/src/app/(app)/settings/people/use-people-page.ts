'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CreatePersonInput } from '@gastos/shared'
import { useArchivePerson } from '@/hooks/queries/use-archive-person'
import { useCreatePerson } from '@/hooks/queries/use-create-person'
import { usePeople } from '@/hooks/queries/use-people'
import { useUpdatePerson } from '@/hooks/queries/use-update-person'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração (04-padroes-codigo). Linha de adicionar sempre visível (protótipo
// 06-pessoas: campo + "Adicionar" inline, sem alternar formulário) — submissão numerada pra limpar o
// campo sem deixar erro velho reaparecer numa tentativa seguinte.
export function usePeoplePage() {
  const people = usePeople()
  const createPerson = useCreatePerson()
  const archivePerson = useArchivePerson()
  const updatePerson = useUpdatePerson()
  const [menuId, setMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const submissionRef = useRef(0)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreatePersonInput>({ defaultValues: { name: '' } })

  const onSubmit = handleSubmit(async (values) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      await createPerson.mutateAsync(values)
      if (submission !== submissionRef.current) return
      reset()
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) {
        setError('name', { message: fieldErrors.name[0] })
      } else {
        setRuleError(error.error.message)
      }
    }
  })

  const startEdit = (id: string, currentName: string) => {
    setMenuId(null)
    setEditingId(id)
    setNameDraft(currentName)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setEditError(null)
    try {
      await updatePerson.mutateAsync({ id: editingId, input: { name: nameDraft } })
      setEditingId(null)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      setEditError(fieldErrors?.name?.[0] ?? error.error.message)
    }
  }

  return {
    editingId,
    nameDraft,
    setNameDraft,
    editError,
    startEdit,
    cancelEdit,
    saveEdit: () => void saveEdit(),
    isSavingEdit: updatePerson.isPending,
    people: people.data ?? [],
    isLoadingPeople: people.isPending,
    register,
    errors,
    onSubmit,
    isSubmitting: createPerson.isPending,
    ruleError,
    menuPerson: (people.data ?? []).find((person) => person.id === menuId) ?? null,
    openMenu: (id: string) => setMenuId(id),
    closeMenu: () => setMenuId(null),
    archivePerson: (id: string) => {
      setMenuId(null)
      archivePerson.mutate(id)
    },
    archivingId: archivePerson.isPending ? archivePerson.variables : undefined,
  }
}
