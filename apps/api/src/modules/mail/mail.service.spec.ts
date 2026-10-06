import type { ConfigService } from '@nestjs/config'
import { MailService } from './mail.service'

function config(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
    getOrThrow: (key: string) => {
      if (!(key in values)) throw new Error(`missing ${key}`)
      return values[key]
    },
  } as unknown as ConfigService
}

describe('MailService', () => {
  it('usa o transporte log por padrão e nunca lança ao enviar', async () => {
    const service = new MailService(config({}))
    expect(service.transportKind).toBe('log')
    await expect(service.send({ to: 'a@b.com', subject: 'x', text: 'y' })).resolves.toBeUndefined()
  })

  it('exige as credenciais SMTP quando MAIL_TRANSPORT=smtp', () => {
    expect(() => new MailService(config({ MAIL_TRANSPORT: 'smtp' }))).toThrow('missing MAIL_HOST')
    expect(() => new MailService(config({ MAIL_TRANSPORT: 'smtp', MAIL_HOST: 'smtp.example.com' }))).toThrow(
      'missing MAIL_AUTH_USER',
    )
  })

  it('com MAIL_TRANSPORT=smtp e credenciais completas, monta o transporte sem lançar', () => {
    expect(
      () =>
        new MailService(
          config({
            MAIL_TRANSPORT: 'smtp',
            MAIL_HOST: 'smtp.example.com',
            MAIL_PORT: '465',
            MAIL_AUTH_USER: 'user@example.com',
            MAIL_AUTH_PASS: 'secret',
          }),
        ),
    ).not.toThrow()
  })
})
