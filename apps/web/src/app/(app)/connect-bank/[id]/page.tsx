'use client'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { useConnectBankPage } from './use-connect-bank-page'

const STATUS_LABEL: Record<string, string> = {
  WAITING_USER_INPUT: 'Aguardando você autorizar no banco…',
  UPDATING: 'Lendo suas compras…',
}

export default function ConnectBankPage() {
  const {
    connectionStatus,
    isError,
    step,
    people,
    register,
    errors,
    onAddPerson,
    isAddingPerson,
    ruleError,
    archivePerson,
    archivingId,
    finish,
  } = useConnectBankPage()

  if (step === 'connecting') {
    return (
      <main className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-6 px-4 pb-28 md:pb-10">
        {!isError && (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface border-t-primary" />
            <p className="text-center text-lg font-medium text-ink">
              {(connectionStatus && STATUS_LABEL[connectionStatus]) ?? 'Conectando…'}
            </p>
            <p className="text-center text-sm text-muted">Pode sair dessa tela — a leitura continua sozinha.</p>
          </>
        )}
        {isError && (
          <>
            <InlineAlert>Não deu pra conectar esse banco agora. Tente de novo pela Home.</InlineAlert>
            <Button onClick={finish}>Voltar pra Início</Button>
          </>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 pt-8 md:pb-10">
      <div>
        <h1 className="display-number text-[2rem] text-ink">Quem mais usa seus cartões?</h1>
        <p className="mt-2 text-text">Só o nome, para separar as compras. Nada de CPF nem de telefone.</p>
      </div>

      {ruleError && <InlineAlert>{ruleError}</InlineAlert>}

      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li key={person.id} className="flex items-center justify-between rounded-card border border-border p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-sm font-bold text-primary-ink">
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-ink">{person.name}</span>
              {person.isSelf && <Badge>Você</Badge>}
            </div>
            {!person.isSelf && (
              <Button
                variant="link"
                size="sm"
                state={archivingId === person.id ? 'loading' : 'idle'}
                onClick={() => archivePerson(person.id)}
              >
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>

      <form className="flex items-end gap-3" onSubmit={onAddPerson} noValidate>
        <div className="flex-1">
          <Input label="Nome" placeholder="Pai" error={errors.name?.message} {...register('name')} />
        </div>
        <Button type="submit" state={isAddingPerson ? 'loading' : 'idle'}>
          Adicionar
        </Button>
      </form>

      <div className="mt-2 flex flex-col items-center gap-3">
        <Button className="w-full" onClick={finish}>
          Continuar
        </Button>
        <Button variant="link" onClick={finish}>
          Pular por enquanto
        </Button>
      </div>
    </main>
  )
}
