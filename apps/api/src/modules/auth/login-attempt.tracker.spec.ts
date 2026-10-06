import { LOGIN_WINDOW_MS, LoginAttemptTracker, MAX_LOGIN_ATTEMPTS } from './login-attempt.tracker'

describe('LoginAttemptTracker', () => {
  afterEach(() => jest.restoreAllMocks())

  it('não bloqueia uma chave nunca usada', () => {
    expect(new LoginAttemptTracker().isLocked('email:a@b.com')).toBe(false)
  })

  it(`bloqueia depois de ${MAX_LOGIN_ATTEMPTS} falhas na mesma janela`, () => {
    const tracker = new LoginAttemptTracker()
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(false)
    tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(true)
  })

  it('reset libera a chave imediatamente', () => {
    const tracker = new LoginAttemptTracker()
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) tracker.recordFailure('email:a@b.com')
    tracker.reset('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(false)
  })

  it('a janela expira depois de 15 minutos', () => {
    const tracker = new LoginAttemptTracker()
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(true)
    jest.spyOn(Date, 'now').mockReturnValue(now + LOGIN_WINDOW_MS)
    expect(tracker.isLocked('email:a@b.com')).toBe(false)
  })

  it('e-mail e IP são chaves independentes — bloquear uma não bloqueia a outra', () => {
    const tracker = new LoginAttemptTracker()
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(true)
    expect(tracker.isLocked('ip:1.2.3.4')).toBe(false)
  })

  describe('varredura periódica (o Map não pode crescer sem limite)', () => {
    afterEach(() => jest.useRealTimers())

    it('remove uma chave expirada sozinha, mesmo sem isLocked() ser chamado de novo para ela', () => {
      jest.useFakeTimers()
      const tracker = new LoginAttemptTracker()
      tracker.onModuleInit()

      tracker.recordFailure('email:nunca-mais-consultado@b.com')
      expect(tracker.size).toBe(1)

      jest.advanceTimersByTime(LOGIN_WINDOW_MS + 1)

      expect(tracker.size).toBe(0)
      tracker.onModuleDestroy()
    })

    it('mantém uma chave ainda dentro da janela', () => {
      jest.useFakeTimers()
      const tracker = new LoginAttemptTracker()
      tracker.onModuleInit()

      tracker.recordFailure('email:ativo@b.com')
      jest.advanceTimersByTime(LOGIN_WINDOW_MS - 1)

      expect(tracker.size).toBe(1)
      tracker.onModuleDestroy()
    })

    it('varre várias chaves de uma vez, removendo só as expiradas', () => {
      jest.useFakeTimers()
      const tracker = new LoginAttemptTracker()
      tracker.onModuleInit()

      tracker.recordFailure('email:vai-expirar-1@b.com')
      tracker.recordFailure('email:vai-expirar-2@b.com')
      jest.advanceTimersByTime(LOGIN_WINDOW_MS + 1)
      tracker.recordFailure('email:ainda-ativo@b.com')

      // O intervalo de varredura é o mesmo da janela (LOGIN_WINDOW_MS) — ver login-attempt.tracker.ts.
      jest.advanceTimersByTime(LOGIN_WINDOW_MS)

      expect(tracker.size).toBe(1)
      tracker.onModuleDestroy()
    })

    it('onModuleDestroy encerra o timer sem lançar, mesmo sem onModuleInit ter sido chamado', () => {
      const tracker = new LoginAttemptTracker()
      expect(() => tracker.onModuleDestroy()).not.toThrow()
    })
  })
})
