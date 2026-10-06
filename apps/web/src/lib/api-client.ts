import type { z } from 'zod'
import { apiErrorSchema, type ApiError } from '@gastos/shared'
import { env } from './env'

export class ApiClientError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message)
    this.name = 'ApiClientError'
  }
}

interface RequestOptions<TSchema extends z.ZodTypeAny> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  schema: TSchema
  headers?: Record<string, string>
}

// Único ponto de contato do frontend com a API. A resposta é `unknown` até passar pelo schema Zod de
// @gastos/shared (o mesmo contrato que a API valida). Aqui o schema só TIPA a resposta; nunca decide se o
// que o usuário digitou é válido (04-padroes-codigo § Formulários).
export async function apiRequest<TSchema extends z.ZodTypeAny>(
  path: string,
  { method = 'GET', body, schema, headers }: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const baseUrl = typeof window === 'undefined' ? env.apiInternalUrl : env.apiUrl

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiClientError({ statusCode: 0, code: 'NETWORK_ERROR', message: 'Falha ao comunicar com o servidor.' })
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload)
    throw new ApiClientError(
      parsed.success
        ? parsed.data
        : { statusCode: response.status, code: 'HTTP_ERROR', message: 'Falha ao comunicar com o servidor.' },
    )
  }

  return schema.parse(payload)
}
