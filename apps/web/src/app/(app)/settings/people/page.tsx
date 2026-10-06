'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'
import { usePeoplePage } from './use-people-page'

// Layout segue o protótipo (06-pessoas: linha com avatar + nome, sem card por item, divisória fina; campo
// de adicionar sempre visível no fim da lista).
export default function PeoplePage() {
  const { people, isLoadingPeople, register, errors, onSubmit, isSubmitting, ruleError, archivePerson, archivingId } =
    usePeoplePage()

  let othersIndex = 0

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Pessoas</h1>
      </div>

      {isLoadingPeople && <p className="text-text">Carregando…</p>}

      {people.length > 0 && (
        <ul className="flex flex-col">
          {people.map((person) => {
            const avatarClass = personAvatarClass(person.isSelf, person.isSelf ? 0 : othersIndex++)
            return (
              <li key={person.id} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarClass}`}
                >
                  {personInitial(person.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{person.name}</p>
                  {person.isSelf && <p className="text-sm text-muted">Você. Não dá pra remover.</p>}
                </div>
                {!person.isSelf && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-[34px] !px-0"
                    state={archivingId === person.id ? 'loading' : 'idle'}
                    onClick={() => archivePerson(person.id)}
                    aria-label={`Remover ${person.name}`}
                  >
                    <X size={18} strokeWidth={1.8} />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form className="flex flex-col gap-2" onSubmit={onSubmit} noValidate>
        {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Input
              label="Nova pessoa"
              placeholder="Cônjuge, filho..."
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <Button type="submit" state={isSubmitting ? 'loading' : 'idle'} className="mt-[27px]">
            Adicionar
          </Button>
        </div>
      </form>
    </main>
  )
}
