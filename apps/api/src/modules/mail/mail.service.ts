import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createTransport, type Transporter } from 'nodemailer'

export interface MailMessage {
  to: string
  subject: string
  text: string
}

export type MailTransportKind = 'log' | 'smtp'

// `log` (padrão em dev/teste) só escreve o e-mail no console da API — o link de reset aparece ali, sem
// precisar de credencial nenhuma. `smtp` usa um provedor externo de verdade. Texto puro, nunca HTML: entrega
// melhor em provedores corporativos e não abre superfície de injeção (mesmo padrão do pdv-web).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  readonly transportKind: MailTransportKind
  private readonly from: string
  private readonly smtp: Transporter | null

  constructor(config: ConfigService) {
    this.transportKind = config.get<string>('MAIL_TRANSPORT') === 'smtp' ? 'smtp' : 'log'
    this.from = config.get<string>('MAIL_FROM', 'AbacaTudo <no-reply@localhost>')
    this.smtp =
      this.transportKind === 'smtp'
        ? createTransport({
            host: config.getOrThrow<string>('MAIL_HOST'),
            port: Number(config.get<string>('MAIL_PORT', '587')),
            // 465 é sempre TLS implícito; qualquer outra porta usa STARTTLS por padrão, a menos que
            // MAIL_SECURE force o contrário (provedor incomum).
            secure: config.get<string>('MAIL_SECURE', String(config.get<string>('MAIL_PORT') === '465')) === 'true',
            auth: {
              user: config.getOrThrow<string>('MAIL_AUTH_USER'),
              pass: config.getOrThrow<string>('MAIL_AUTH_PASS'),
            },
          })
        : null
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.smtp) {
      this.logger.log(`[mail:log] to=${message.to} subject="${message.subject}"\n${message.text}`)
      return
    }
    await this.smtp.sendMail({ from: this.from, to: message.to, subject: message.subject, text: message.text })
  }
}
