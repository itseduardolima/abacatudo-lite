import type { Request, Response } from 'express'
import { getRequestId } from '../request-context'
import { REQUEST_ID_HEADER, RequestIdMiddleware } from './request-id.middleware'

describe('RequestIdMiddleware', () => {
  it('gera um requestId, devolve no header e o disponibiliza no contexto', () => {
    const setHeader = jest.fn()
    let seen: string | undefined
    new RequestIdMiddleware().use({} as Request, { setHeader } as unknown as Response, () => {
      seen = getRequestId()
    })
    expect(seen).toMatch(/^[0-9a-f-]{36}$/)
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, seen)
  })

  it('cada request recebe um id diferente', () => {
    const ids: (string | undefined)[] = []
    const mw = new RequestIdMiddleware()
    for (let i = 0; i < 3; i++)
      mw.use({} as Request, { setHeader: jest.fn() } as unknown as Response, () => ids.push(getRequestId()))
    expect(new Set(ids).size).toBe(3)
  })
})
