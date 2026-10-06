import { requestStorage } from '../request-context'
import { runAsUser } from '../user-context'
import { StructuredLogger } from './structured-logger'

function capture() {
  const lines: Record<string, unknown>[] = []
  jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    lines.push(JSON.parse(String(chunk)) as Record<string, unknown>)
    return true
  })
  return lines
}

describe('StructuredLogger', () => {
  afterEach(() => jest.restoreAllMocks())

  it('escreve uma linha JSON com timestamp, level e message', () => {
    const lines = capture()
    new StructuredLogger(false).log('subiu', 'Bootstrap')
    expect(lines[0]).toMatchObject({ level: 'log', message: 'subiu', context: 'Bootstrap' })
    expect(typeof lines[0]?.timestamp).toBe('string')
  })

  it('inclui requestId e userId quando existem no contexto', async () => {
    const lines = capture()
    await requestStorage.run({ requestId: 'req-1' }, () =>
      runAsUser('user-9', async () => new StructuredLogger(false).log('oi')),
    )
    expect(lines[0]).toMatchObject({ requestId: 'req-1', userId: 'user-9' })
  })

  it('em produção descarta debug e verbose, mas mantém log/warn/error', () => {
    const lines = capture()
    const logger = new StructuredLogger(true)
    logger.debug('a')
    logger.verbose('b')
    logger.log('c')
    logger.warn('d')
    logger.error('e')
    expect(lines.map((l) => l.level)).toEqual(['log', 'warn', 'error'])
  })

  it('preserva a mensagem e o stack de um Error (props de Error não são enumeráveis)', () => {
    const lines = capture()
    new StructuredLogger(false).error(new Error('quebrou'))
    expect(lines[0]).toMatchObject({ message: 'quebrou' })
    expect(String(lines[0]?.trace)).toContain('Error: quebrou')
  })

  it('mascara segredos em objetos logados (08-seguranca § 10)', () => {
    const lines = capture()
    new StructuredLogger(false).log({ email: 'a@b.com', password: 'super-secreta', token: 't' })
    const message = String(lines[0]?.message)
    expect(message).not.toContain('super-secreta')
    expect(message).toContain('[redacted]')
  })

  it('não perde a chave message para undefined/função', () => {
    const lines = capture()
    const logger = new StructuredLogger(false)
    logger.log(undefined)
    logger.log(() => 1)
    expect(lines.every((l) => typeof l.message === 'string')).toBe(true)
  })
})
