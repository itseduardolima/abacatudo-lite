import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { ZodValidationException } from 'nestjs-zod'
import type { ApiError } from '@gastos/shared'
import { DomainError } from '../errors/domain.error'

// Formato fixo de erro em qualquer ambiente (08-seguranca § 9): nunca stack, tabela, SQL nem corpo de
// erro de API externa. Erro inesperado: o cliente recebe mensagem genérica, o log recebe a causa.
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const body = this.toBody(exception)
    if (body.code === 'INTERNAL_ERROR') {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception))
    }
    response.status(body.statusCode).json(body)
  }

  private toBody(exception: unknown): ApiError {
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      }
    }
    if (exception instanceof ZodValidationException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION',
        message: 'Dados inválidos.',
        details: exception.getZodError().flatten(),
      }
    }
    if (exception instanceof HttpException) {
      // Mensagem fixa em português por status: o texto de HttpException/biblioteca (em inglês, às vezes com
      // detalhe interno, ex.: "Unexpected end of JSON input") nunca chega ao cliente.
      const status = exception.getStatus()
      return { statusCode: status, code: codeForStatus(status), message: messageForStatus(status) }
    }
    const clientStatus = clientErrorStatus(exception)
    if (clientStatus) {
      // Erro do cliente vindo do body-parser (JSON malformado, payload grande): mensagem fixa, sem
      // repassar o texto da biblioteca e sem tratar como falha do servidor.
      return clientStatus === 413
        ? { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'O conteúdo enviado é grande demais.' }
        : { statusCode: clientStatus, code: 'INVALID_REQUEST', message: 'Requisição inválida.' }
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro inesperado.',
    }
  }
}

// Erros do http-errors (usados pelo body-parser) trazem status 4xx e `expose: true`.
function clientErrorStatus(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined
  const { status, statusCode, expose } = exception as { status?: unknown; statusCode?: unknown; expose?: unknown }
  const value = typeof status === 'number' ? status : typeof statusCode === 'number' ? statusCode : undefined
  return expose === true && value !== undefined && value >= 400 && value < 500 ? value : undefined
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Requisição inválida.'
    case 401:
      return 'Faça login para continuar.'
    case 403:
      return 'Você não tem permissão para isso.'
    case 404:
      return 'Não encontrado.'
    case 413:
      return 'O conteúdo enviado é grande demais.'
    case 429:
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
    default:
      return 'Não foi possível concluir a requisição.'
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'INVALID_REQUEST'
    case 401:
      return 'UNAUTHENTICATED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 413:
      return 'PAYLOAD_TOO_LARGE'
    case 429:
      return 'TOO_MANY_REQUESTS'
    default:
      return 'HTTP_ERROR'
  }
}
