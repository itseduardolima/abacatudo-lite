# Tecnologias

Mesma base do `pdv-web`. A tabela abaixo lista o que é **igual** (só
referenciado) e o que é **específico** deste projeto (detalhado).

## Igual ao pdv-web (ver `../pdv-web/docs/specs/02-tecnologias.md`)

| Camada      | Escolha                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| Monorepo    | pnpm workspaces + Turborepo                                                        |
| Backend     | NestJS + TypeScript strict, Prisma + PostgreSQL 16                                 |
| Validação   | `nestjs-zod` sobre schemas Zod de `packages/shared`                                |
| Frontend    | Next.js 14+ (App Router, só frontend), Tailwind, Radix UI, TanStack Query, Zustand |
| Formulários | React Hook Form sem resolver — validação é sempre da API                           |
| Testes      | Jest (Service com Repository mockado), Cypress (component + E2E)                   |
| Qualidade   | ESLint + Prettier em `packages/config`, sem `any`, CI no GitHub Actions            |
| Docs de API | `@nestjs/swagger`                                                                  |
| Hospedagem  | VPS própria, Docker Compose, Caddy (TLS automático). Nada de PaaS                  |
| PWA         | Serwist (`@serwist/next`), só cache de leitura                                     |
| Backup      | `pg_dump` criptografado para destino S3-compatível fora da VPS                     |

## Específico deste projeto

| Camada                  | Escolha                                                                                                                                                                  | Por quê                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                    | Sessão por **token opaco** em cookie `__Host-` `httpOnly` (tabela `Session` no servidor, revogável), senha com **argon2id**, **TOTP (2FA)** opcional no v1 e recomendado | Login por e-mail+senha (não PIN): dado financeiro real, celular pessoal. Token opaco, não JWT: dá para revogar no servidor (08 § 4). 2FA entra porque o modelo de ameaça aqui é dado bancário            |
| Isolamento              | Postgres RLS por `user_id` + `Repository` com `userId` obrigatório                                                                                                       | Mesmo desenho de duas camadas do PDV, trocando `tenantId` por `userId`                                                                                                                                   |
| Integração bancária     | **Pluggy** (Open Finance), SDK server-side + widget Pluggy Connect no front                                                                                              | Único caminho realista para uso pessoal (só instituições reguladas acessam Open Finance direto). Plano pago (R$ 2.500/mês) inviável: caminho gratuito é o conector **Meu Pluggy**, sem webhooks (ver 07) |
| Criptografia em repouso | AES-256-GCM (`node:crypto`) com `DATA_ENCRYPTION_KEY`, para tokens de item e segredo TOTP                                                                                | Um dump de banco vazado não pode entregar acesso aos bancos nem ao 2FA                                                                                                                                   |
| Dinheiro                | Inteiro em centavos (`amountCents`), nunca `number` decimal; lib de cálculo só para divisão/rateio                                                                       | Mesma regra do PDV. Rateio de compra entre pessoas usa distribuição do resto de centavos (soma sempre fecha)                                                                                             |
| Datas                   | `timestamptz` em UTC no banco; "mês" e "dia" sempre calculados em `America/Manaus`                                                                                       | Compra às 23h30 do dia 31 não pode cair no mês seguinte por fuso                                                                                                                                         |
| Import                  | `multer` em memória + parser OFX/CSV com limites estritos                                                                                                                | Fallback para bancos sem conector; arquivo nunca gravado em disco (ver 08 § 6)                                                                                                                           |
| Jobs                    | `@nestjs/schedule` + `pg_advisory_lock`                                                                                                                                  | Sem Redis/fila em v1: um ou dois usuários não justificam infra extra                                                                                                                                     |
| IA                      | **API da Groq** (`GROQ_API_KEY`, chamada crua via fetch — formato compatível com OpenAI), só no servidor, modelo configurável (`AI_MODEL`)                               | Categorização, narrativa de insights e chat com tool-use somente-leitura (ver 10). Camada gratuita generosa; conta feita em código, não pelo modelo                                                      |
| Gráficos                | Recharts (ou visx), seguindo a skill `dataviz` para paleta/acessibilidade                                                                                                | Dashboard é o produto; gráfico precisa ser legível no celular, no claro e no escuro                                                                                                                      |
| E-mail                  | SMTP externo via `nodemailer`                                                                                                                                            | Convite, redefinir senha, aviso de consentimento vencendo                                                                                                                                                |

## Coisas que optamos por NÃO usar (e por quê)

- **Supabase / Firebase / qualquer BaaS**: cliente falando direto com o banco
  faz a segurança depender de cada política estar certa para sempre; e o
  projeto hospeda tudo na VPS. Mesma decisão do `pdv-web`.
- **Better Auth / Auth.js**: o `pdv-web` já tem auth próprio no Nest
  (`AuthGuard` global + cookie + argon2), mas com sessão opaca em vez de JWT. Reaproveitar o padrão é menos
  superfície nova do que introduzir outra biblioteca de auth.
- **Cliente bancário próprio / scraping**: guardar login e senha de banco é
  risco inaceitável. Só Open Finance via agregador (consentimento revogável,
  somente leitura).
- **Redis/BullMQ**: sem necessidade de fila em v1.
- **LLM decidindo números**: soma, limite, comparação e detecção são código
  determinístico; o modelo só classifica texto e narra resultado já calculado.
- **App nativo, GraphQL, Redux**: mesmos motivos do `pdv-web`.
