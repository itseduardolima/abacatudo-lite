import type { LoggerService, LogLevel } from '@nestjs/common'
import { getRequestId } from '../request-context'
import { currentUserId } from '../user-context'
import { redact } from './redact'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  requestId?: string
  userId?: string
  trace?: string
}

// debug/verbose só em desenvolvimento (08-seguranca § 9); log/warn/error/fatal sempre.
const PRODUCTION_LEVELS: LogLevel[] = ['log', 'warn', 'error', 'fatal']

// Toda linha vira JSON com timestamp/level/userId/requestId (09-operacao § 3). Objetos passam por redact().
export class StructuredLogger implements LoggerService {
  private readonly isProduction: boolean

  constructor(isProduction = process.env.NODE_ENV === 'production') {
    this.isProduction = isProduction
  }

  log(message: unknown, context?: string) {
    this.write('log', message, context)
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace)
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context)
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context)
  }

  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context)
  }

  fatal(message: unknown, context?: string) {
    this.write('fatal', message, context)
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string) {
    if (this.isProduction && !PRODUCTION_LEVELS.includes(level)) return

    const requestId = getRequestId()
    const userId = currentUserId()
    const { text, derivedTrace } = normalizeMessage(message)
    const finalTrace = trace ?? derivedTrace
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: text,
      ...(context ? { context } : {}),
      ...(requestId ? { requestId } : {}),
      ...(userId ? { userId } : {}),
      ...(finalTrace ? { trace: finalTrace } : {}),
    }
    process.stdout.write(`${JSON.stringify(entry)}\n`)
  }
}

// As props de Error não são enumeráveis: JSON.stringify(new Error()) devolveria '{}'.
function normalizeMessage(value: unknown): { text: string; derivedTrace?: string } {
  if (typeof value === 'string') return { text: redact(value) as string }
  if (value instanceof Error) return { text: value.message, derivedTrace: value.stack }
  return { text: safeStringify(redact(value)) }
}

function safeStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value)
    return json === undefined ? String(value) : json
  } catch {
    return String(value)
  }
}
