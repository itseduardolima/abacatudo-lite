import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'

export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_WINDOW_MS = 15 * 60 * 1000
// Sem isto, uma chave que nunca chega ao limite (ou nunca é reconsultada) ficaria para sempre no Map —
// varredura periódica em vez de confiar só na limpeza preguiçosa de isLocked() (08-seguranca § 5: vetor
// de DoS por memória, já que "a API roda numa instância só").
const SWEEP_INTERVAL_MS = LOGIN_WINDOW_MS

interface AttemptState {
  failures: number
  windowStartedAt: number
}

// Rate limit de login (03-regras-negocio § Autenticação): 5 falhas em 15 min bloqueiam a próxima
// tentativa. Chamado com duas chaves por login (email:<e-mail> e ip:<ip>) — qualquer uma das duas
// bloqueia, para cobrir tanto um IP testando vários e-mails quanto um e-mail atacado de vários IPs.
// Em memória — a API roda numa instância só.
@Injectable()
export class LoginAttemptTracker implements OnModuleInit, OnModuleDestroy {
  private readonly attempts = new Map<string, AttemptState>()
  private sweepTimer?: NodeJS.Timeout

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS)
    // unref: o timer de limpeza não pode ser o motivo do processo não encerrar (ex.: em teste/shutdown).
    this.sweepTimer.unref()
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer)
  }

  isLocked(key: string): boolean {
    const state = this.attempts.get(key)
    if (!state) return false
    if (this.expired(state)) {
      this.attempts.delete(key)
      return false
    }
    return state.failures >= MAX_LOGIN_ATTEMPTS
  }

  recordFailure(key: string): void {
    const state = this.attempts.get(key)
    if (!state || this.expired(state)) {
      this.attempts.set(key, { failures: 1, windowStartedAt: Date.now() })
      return
    }
    state.failures += 1
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }

  // Só para teste observar o tamanho do Map sem expor o Map inteiro.
  get size(): number {
    return this.attempts.size
  }

  private sweep(): void {
    for (const [key, state] of this.attempts) {
      if (this.expired(state)) this.attempts.delete(key)
    }
  }

  private expired(state: AttemptState): boolean {
    return Date.now() - state.windowStartedAt >= LOGIN_WINDOW_MS
  }
}
