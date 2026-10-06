import { AsyncLocalStorage } from 'node:async_hooks'

export interface UserContext {
  userId: string
}

// Equivalente do tenantStorage do pdv-web: o usuário da request (ou do job) vive aqui, nunca é
// argumento escolhido pelo Controller (08-seguranca § 1). O AuthGuard preenche na Sprint 1.
export const userStorage = new AsyncLocalStorage<UserContext>()

export function getUserId(): string {
  const context = userStorage.getStore()
  if (!context) throw new Error('User not resolved for this request')
  return context.userId
}

export function currentUserId(): string | undefined {
  return userStorage.getStore()?.userId
}

// Para jobs em background (sync, insights): um usuário por vez, declarado explicitamente. O `await` da
// query precisa acontecer DENTRO de `fn` — devolver a promise sem awaitar perde o contexto (08 § 1).
export function runAsUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return userStorage.run({ userId }, fn)
}
