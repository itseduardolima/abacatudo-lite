import { validateEnv } from './env'

const dev = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', SESSION_SECRET: 'x'.repeat(40) }
const prod = {
  ...dev,
  NODE_ENV: 'production',
  DATA_ENCRYPTION_KEY: 'ab'.repeat(32),
  MAIL_TRANSPORT: 'smtp',
  MAIL_HOST: 'smtp.example.com',
  MAIL_AUTH_USER: 'user@example.com',
  MAIL_AUTH_PASS: 'secret',
}

describe('validateEnv', () => {
  it('aplica os padrões: 30 dias de sessão, rate limit ligado, porta 3001', () => {
    expect(validateEnv(dev)).toMatchObject({
      SESSION_IDLE_DAYS: 30,
      RATE_LIMIT_ENABLED: 'true',
      PORT: 3001,
      NODE_ENV: 'development',
    })
  })

  it('exige DATABASE_URL válida e SESSION_SECRET de 32+ caracteres', () => {
    expect(() => validateEnv({ ...dev, DATABASE_URL: 'nao-e-url' })).toThrow('DATABASE_URL')
    expect(() => validateEnv({ ...dev, SESSION_SECRET: 'curto' })).toThrow('SESSION_SECRET')
  })

  it('em desenvolvimento não exige DATA_ENCRYPTION_KEY', () => {
    expect(() => validateEnv(dev)).not.toThrow()
  })

  it('aceita uma configuração de produção correta', () => {
    expect(validateEnv(prod)).toMatchObject({ NODE_ENV: 'production' })
  })

  it('em produção recusa segredo com valor de exemplo', () => {
    expect(() => validateEnv({ ...prod, SESSION_SECRET: 'change-me-to-a-long-random-secret-value' })).toThrow(
      'valor de exemplo',
    )
    expect(() => validateEnv({ ...prod, SESSION_SECRET: 'gere-um-segredo-longo-e-aleatorio-aqui-1' })).toThrow(
      'SESSION_SECRET',
    )
  })

  it('em produção exige DATA_ENCRYPTION_KEY com 64 hex', () => {
    expect(() => validateEnv({ ...prod, DATA_ENCRYPTION_KEY: undefined })).toThrow('DATA_ENCRYPTION_KEY')
    expect(() => validateEnv({ ...prod, DATA_ENCRYPTION_KEY: 'zz'.repeat(32) })).toThrow('DATA_ENCRYPTION_KEY')
    expect(() => validateEnv({ ...prod, DATA_ENCRYPTION_KEY: 'ab'.repeat(16) })).toThrow('DATA_ENCRYPTION_KEY')
  })

  it('em produção o rate limit nunca pode estar desligado', () => {
    expect(() => validateEnv({ ...prod, RATE_LIMIT_ENABLED: 'false' })).toThrow('rate limit')
  })

  it('em produção exige MAIL_TRANSPORT=smtp com credenciais completas', () => {
    expect(() => validateEnv({ ...prod, MAIL_TRANSPORT: 'log' })).toThrow('MAIL_TRANSPORT')
    expect(() => validateEnv({ ...prod, MAIL_HOST: undefined })).toThrow('MAIL_HOST')
    expect(() => validateEnv({ ...prod, MAIL_AUTH_USER: undefined })).toThrow('MAIL_AUTH_USER')
    expect(() => validateEnv({ ...prod, MAIL_AUTH_PASS: undefined })).toThrow('MAIL_AUTH_PASS')
  })

  it('em desenvolvimento, sem nenhuma variável de e-mail, cai no transporte log', () => {
    expect(validateEnv(dev)).toMatchObject({ MAIL_TRANSPORT: 'log' })
  })
})
