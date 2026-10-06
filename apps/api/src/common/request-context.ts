import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestContext {
  requestId: string
}

// requestId gerado em RequestIdMiddleware (09-operacao § 3): todo log de uma request é correlacionável.
export const requestStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestId(): string | undefined {
  return requestStorage.getStore()?.requestId
}
