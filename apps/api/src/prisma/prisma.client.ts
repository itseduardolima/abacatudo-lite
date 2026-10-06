import { PrismaClient } from '@prisma/client'
import { userStorage } from '../common/user-context'

// Extensão de RLS (08-seguranca § 1): toda operação de model roda com `app.user_id` setado na mesma
// transação, e as policies do Postgres recusam linhas de outro usuário — mesmo se um Repository esquecer
// o filtro. Sem usuário no contexto nada é setado: tabelas com RLS não devolvem linha nenhuma.
// (As policies chegam junto com cada tabela; a Sprint 1.1 prova o isolamento com 2 usuários.)
export function createPrismaClient() {
  const base = new PrismaClient()
  // $allOperations de nível superior (não $allModels): cobre os models e também as consultas cruas
  // ($queryRaw do health), e continua tipando enquanto ainda não existe nenhum model.
  return base.$extends({
    query: {
      async $allOperations({ args, query, ...rest }) {
        const userId = userStorage.getStore()?.userId
        // Em transação interativa quem seta o usuário é o próprio callback (setUserInTransaction).
        const inTransaction = Boolean(
          (rest as { __internalParams?: { transaction?: unknown } }).__internalParams?.transaction,
        )
        if (!userId || inTransaction) return query(args)
        const [, result] = await base.$transaction([
          base.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`,
          query(args),
        ])
        return result
      },
    },
  })
}

export type PrismaService = ReturnType<typeof createPrismaClient>
export type PrismaTransaction = Parameters<Parameters<PrismaService['$transaction']>[0]>[0]
export const PRISMA = Symbol('PRISMA')

export function setUserInTransaction(tx: PrismaTransaction, userId: string) {
  return tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`
}
