import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'

export interface BadgePerson {
  id: string
  name: string
  isSelf: boolean
  othersIndex: number
}

interface PersonBadgeProps {
  personName: string | null
  personIsSelf: boolean
  personOthersIndex: number
  splitPeople: BadgePerson[]
}

// "Eu" é o padrão (03-regras-negocio § Atribuição de pessoa: toda transação nasce Meu) — mostrar o avatar
// nesse caso só repetia informação óbvia em toda linha; só vale a pena chamar atenção quando é de outra
// pessoa. Dividida: os avatares de quem entra na divisão, pequenos e sobrepostos.
export function PersonBadge({ personName, personIsSelf, personOthersIndex, splitPeople }: PersonBadgeProps) {
  if (splitPeople.length > 0) {
    return (
      <span className="flex -space-x-1.5" aria-label={`Dividido entre ${splitPeople.map((p) => p.name).join(', ')}`}>
        {splitPeople.map((person) => (
          <span
            key={person.id}
            title={person.name}
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-canvas ${personAvatarClass(
              person.isSelf,
              person.othersIndex,
            )}`}
          >
            {personInitial(person.name)}
          </span>
        ))}
      </span>
    )
  }
  if (personName && !personIsSelf) {
    return (
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${personAvatarClass(
          personIsSelf,
          personOthersIndex,
        )}`}
      >
        {personInitial(personName)}
      </span>
    )
  }
  if (!personName) {
    return <span className="rounded-pill px-2.5 py-1 text-xs text-muted shadow-hair">Sem dono</span>
  }
  return null
}
