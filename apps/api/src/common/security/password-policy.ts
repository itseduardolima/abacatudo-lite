import { DomainError } from '../errors/domain.error'

// 03-regras-negocio § Autenticação: senha >= 12 caracteres, fora de uma lista de senhas comuns. Usado hoje
// só pelo seed (único lugar que cria senha em v1); a mesma função vale para o futuro fluxo de
// cadastro/redefinição de senha, quando existir.
export const MIN_PASSWORD_LENGTH = 12

// Não é uma lista de vazamentos completa (isso seria enorme) — cobre o óbvio: sequências, repetição e
// as variações mais previsíveis do próprio nome do produto. Ampliar se um caso real aparecer.
const COMMON_PASSWORDS = new Set(
  [
    '123456789012',
    '1234567890123',
    'password1234',
    'qwertyuiop12',
    'qwertyuiopas',
    'senha12345678',
    'abcdefghijkl',
    'aaaaaaaaaaaa',
    '111111111111',
    '000000000000',
    'iloveyou1234',
    'letmein12345',
    'abacatudo123',
    'abacatudo1234',
  ].map((value) => value.toLowerCase()),
)

export class WeakPasswordError extends DomainError {
  constructor(message: string) {
    super('WEAK_PASSWORD', message, 400)
  }
}

export function assertStrongPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new WeakPasswordError('Essa senha é muito comum. Escolha outra.')
  }
}
