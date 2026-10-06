// Bootstrap do primeiro usuário (HU 1.9). Idempotente por e-mail: pode rodar de novo sem duplicar nada.
// Só semeia se SEED_USER_EMAIL/SEED_USER_PASSWORD estiverem definidos — sem eles, não faz nada (mesmo
// padrão do pdv-web para o seed do primeiro superadmin).
//
// Roda fora de uma request: por isso seta o usuário explicitamente no AsyncLocalStorage antes de tocar em
// Person/Category (RLS por userId — 08-seguranca § 1), depois de já ter o id do User criado.
import argon2 from 'argon2'
import { assertStrongPassword } from '../src/common/security/password-policy'
import { runAsUser } from '../src/common/user-context'
import { createPrismaClient } from '../src/prisma/prisma.client'

// Mesma lista do seed do pdv-web (03-regras-negocio § Categorias e regras) — o usuário renomeia/arquiva as dele.
const DEFAULT_CATEGORIES = [
  'Mercado',
  'Alimentação fora',
  'Combustível',
  'Transporte',
  'Moradia',
  'Contas fixas',
  'Saúde',
  'Lazer',
  'Assinaturas',
  'Educação',
  'Compras',
  'Viagem',
  'Outros',
]

async function main(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL
  const password = process.env.SEED_USER_PASSWORD
  const personName = process.env.SEED_USER_NAME?.trim() || 'Eu'

  if (!email || !password) {
    console.log('SEED_USER_EMAIL/SEED_USER_PASSWORD não definidos — nada para semear.')
    return
  }

  assertStrongPassword(password)
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  const prisma = createPrismaClient()

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
    select: { id: true, email: true },
  })

  await runAsUser(user.id, async () => {
    const existingSelf = await prisma.person.findFirst({ where: { userId: user.id, isSelf: true } })
    if (existingSelf) {
      if (existingSelf.name !== personName) {
        await prisma.person.update({ where: { id: existingSelf.id }, data: { name: personName } })
      }
    } else {
      await prisma.person.create({ data: { userId: user.id, name: personName, isSelf: true } })
    }

    for (const name of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: {},
        create: { userId: user.id, name },
      })
    }
  })

  await prisma.$disconnect()
  console.log(`Seed ok: ${user.email} (${DEFAULT_CATEGORIES.length} categorias, Person "${personName}")`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
