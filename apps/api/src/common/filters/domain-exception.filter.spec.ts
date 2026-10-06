import { ArgumentsHost, HttpException, Logger } from '@nestjs/common'
import { ZodValidationException } from 'nestjs-zod'
import { z } from 'zod'
import { ConflictError, DomainError, NotFoundError } from '../errors/domain.error'
import { DomainExceptionFilter } from './domain-exception.filter'

function run(exception: unknown) {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost
  new DomainExceptionFilter().catch(exception, host)
  return { status: status.mock.calls[0]?.[0] as number, body: json.mock.calls[0]?.[0] as Record<string, unknown> }
}

describe('DomainExceptionFilter', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined))
  afterEach(() => jest.restoreAllMocks())

  it('DomainError vira o status, o code e a mensagem dela', () => {
    expect(run(new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.'))).toEqual({
      status: 404,
      body: { statusCode: 404, code: 'ACCOUNT_NOT_FOUND', message: 'Conta não encontrada.' },
    })
    expect(run(new ConflictError('X', 'y', { campo: 1 })).body).toMatchObject({ details: { campo: 1 } })
    expect(run(new DomainError('GENERIC', 'msg')).status).toBe(400)
  })

  it('validação Zod vira 400 VALIDATION com details.fieldErrors', () => {
    const parsed = z.object({ name: z.string().min(1) }).safeParse({ name: '' })
    if (parsed.success) throw new Error('esperava falha')
    const { status, body } = run(new ZodValidationException(parsed.error))
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'VALIDATION', message: 'Dados inválidos.' })
    expect(body.details).toMatchObject({ fieldErrors: { name: expect.any(Array) } })
  })

  it('HttpException mapeia o status para um code estável e uma mensagem fixa em português', () => {
    expect(run(new HttpException('x', 429)).body).toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    })
    expect(run(new HttpException('x', 413)).body).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
    expect(run(new HttpException('x', 400)).body).toMatchObject({
      code: 'INVALID_REQUEST',
      message: 'Requisição inválida.',
    })
    expect(run(new HttpException('x', 418)).body).toMatchObject({
      code: 'HTTP_ERROR',
      message: 'Não foi possível concluir a requisição.',
    })
  })

  it('nunca repassa o texto da HttpException (JSON malformado do body-parser, mensagens em inglês)', () => {
    const { body } = run(new HttpException('Unexpected end of JSON input', 400))
    expect(JSON.stringify(body)).not.toMatch(/JSON input|Unexpected/i)
  })

  it('erro do body-parser vira 4xx (payload grande = 413, JSON malformado = 400), nunca 500', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
      type: 'entity.too.large',
    })
    expect(run(tooLarge)).toEqual({
      status: 413,
      body: { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'O conteúdo enviado é grande demais.' },
    })
    const badJson = Object.assign(new SyntaxError('Unexpected token } in JSON at position 9'), {
      statusCode: 400,
      expose: true,
    })
    const { status, body } = run(badJson)
    expect(status).toBe(400)
    expect(body).toEqual({ statusCode: 400, code: 'INVALID_REQUEST', message: 'Requisição inválida.' })
    expect(JSON.stringify(body)).not.toMatch(/token|position|JSON/i)
  })

  it('erro com status mas sem expose continua sendo tratado como falha inesperada (500)', () => {
    expect(run(Object.assign(new Error('x'), { status: 400 })).status).toBe(500)
  })

  it('erro inesperado devolve mensagem genérica e NUNCA vaza a causa (stack, SQL, tabela)', () => {
    const { status, body } = run(new Error('relation "Transaction" does not exist at prisma.$queryRaw SELECT * FROM'))
    expect(status).toBe(500)
    expect(body).toEqual({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado.' })
    expect(JSON.stringify(body)).not.toMatch(/relation|SELECT|prisma|stack/i)
  })

  it('erro inesperado é logado (a causa fica no log, não na resposta)', () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    run(new Error('boom'))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('boom'))
  })
})
