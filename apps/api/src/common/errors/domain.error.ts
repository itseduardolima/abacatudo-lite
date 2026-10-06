export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    // Dado estruturado para o frontend agir (ex.: qual campo falhou).
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 404, details)
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 409, details)
  }
}

export class ForbiddenError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 403)
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code = 'UNAUTHENTICATED', message = 'Faça login para continuar.') {
    super(code, message, 401)
  }
}
