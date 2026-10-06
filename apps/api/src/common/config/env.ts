import { z } from 'zod'

// Placeholders que scripts/deploy-check.sh também recusa: última linha de defesa dentro do processo.
const PLACEHOLDER = /seudominio|gere-|change-me|placeholder|^localhost/i

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET precisa de 32+ caracteres (openssl rand -hex 32).'),
  // Sessão de 30 dias sem uso (janela deslizante) — 08-seguranca § 4.
  SESSION_IDLE_DAYS: z.coerce.number().int().positive().default(30),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true'),
  // Opcionais: sem eles, o PluggyClient recusa chamadas com PLUGGY_NOT_CONFIGURED em vez de travar o boot.
  PLUGGY_CLIENT_ID: z.string().optional(),
  PLUGGY_CLIENT_SECRET: z.string().optional(),
  // Base do link de "esqueci minha senha" (WEB_ORIGIN já é setada pelo docker-compose.yml em produção).
  // Sem ela, cai no dev local (Next.js na 3000).
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  // 'log' (padrão) só escreve o e-mail no console — sem credencial nenhuma, serve pra dev/teste ver o
  // link de reset. 'smtp' exige MAIL_HOST/MAIL_AUTH_USER/MAIL_AUTH_PASS de verdade (MailService valida na
  // hora de montar o transporte, não aqui — mesmo padrão do PluggyClient).
  MAIL_TRANSPORT: z.enum(['log', 'smtp']).default('log'),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_SECURE: z.enum(['true', 'false']).optional(),
  MAIL_AUTH_USER: z.string().optional(),
  MAIL_AUTH_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Sem ela, o GroqClient recusa chamadas (categorização cai para regras, o app funciona inteiro — 10-ia
  // § "recurso desligável"). Groq: camada gratuita, formato compatível com OpenAI.
  GROQ_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('openai/gpt-oss-20b'),
  AI_MONTHLY_TOKEN_BUDGET: z.coerce.number().int().positive().default(200_000),
})

export const envSchema = baseSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return
  const fail = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

  if (PLACEHOLDER.test(env.SESSION_SECRET)) fail('SESSION_SECRET', 'Ainda com valor de exemplo. Gere um segredo real.')
  if (!env.DATA_ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(env.DATA_ENCRYPTION_KEY)) {
    fail('DATA_ENCRYPTION_KEY', 'Em produção precisa de 64 caracteres hex (openssl rand -hex 32).')
  }
  if (env.RATE_LIMIT_ENABLED === 'false')
    fail('RATE_LIMIT_ENABLED', 'O rate limit nunca pode ficar desligado em produção.')
  // 'log' em produção significaria "esqueci minha senha" nunca chega em lugar nenhum de verdade — só no
  // log do container, que ninguém lê pra pegar o próprio link de reset.
  if (env.MAIL_TRANSPORT !== 'smtp') fail('MAIL_TRANSPORT', 'Em produção precisa ser "smtp" — "log" não envia nada.')
  if (!env.MAIL_HOST) fail('MAIL_HOST', 'Obrigatório em produção (MAIL_TRANSPORT=smtp).')
  if (!env.MAIL_AUTH_USER) fail('MAIL_AUTH_USER', 'Obrigatório em produção (MAIL_TRANSPORT=smtp).')
  if (!env.MAIL_AUTH_PASS) fail('MAIL_AUTH_PASS', 'Obrigatório em produção (MAIL_TRANSPORT=smtp).')
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw)
  if (parsed.success) return parsed.data
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  throw new Error(`Configuração inválida: ${problems}`)
}
