# Arquitetura

## Visão em alto nível

Mesma arquitetura do `pdv-web`: monorepo com **Next.js** (só frontend, SSR +
PWA) consumindo uma **API NestJS** dedicada (REST/JSON) sobre **PostgreSQL**
via Prisma. Nenhuma regra de negócio nem acesso a dado no Next.

```
┌──────────────────────────────────────────────────────────┐
│                     Browser / PWA (celular)                │
│  Next.js App Router (RSC + client islands)                 │
│  - Service Worker: cache de assets + último mês lido       │
└───────────────┬──────────────────────────────────────────┘
                │ HTTPS, mesma origem (/api/*)
┌───────────────▼──────────────────────────────────────────┐
│  Caddy (TLS, headers de segurança, limite de body)         │
└───────┬───────────────────────────────┬──────────────────┘
        │ /*                            │ /api/*
┌───────▼───────────┐   ┌───────────────▼──────────────────┐
│  web (Next.js)     │   │  api (NestJS)                     │
│  só apresentação   │   │  - AuthGuard: sessão do User      │
└───────────────────┘   │  - Módulos por domínio (04)       │
                        │  - Regras nos Services (03)       │
                        │  - Jobs: sync Pluggy, insights    │
                        └───────┬─────────────┬────────────┘
                                │ Prisma      │ HTTPS (saída)
                    ┌───────────▼────────┐   ├──► Pluggy API (Open Finance)
                    │ PostgreSQL (RLS    │   └──► Groq API (IA)
                    │ por user_id)       │
                    └────────────────────┘
```

Só o Caddy publica portas (80/443). Postgres nunca sai da rede Docker. Não há
MinIO: v1 não guarda arquivo (import OFX/CSV é processado em memória e
descartado, ver [08-seguranca](./08-seguranca.md) § 6).

## Por que NestJS separado (e não Next full-stack)

Mesma decisão e mesmos motivos do `pdv-web` (fronteira de domínio explícita,
`Service` testável com `Repository` mockado, contrato reaproveitável). Aqui
pesa ainda mais: a API guarda tokens de bancos e chama serviços externos
(Pluggy, Claude) — isso nunca pode viver perto de código que roda no
browser ou em Server Actions.

## Um domínio só (diferença deliberada do pdv-web)

O `pdv-web` usa hosts separados (`app.`, `api.`, subdomínio por loja) porque é
multi-tenant por host. Aqui não há tenant por host, então:

- Caddy serve **um** `APP_DOMAIN`: `/api/*` → API (prefixo removido pelo
  `handle_path`), o resto → Next.
- Browser e API compartilham a origem: **sem CORS**, sem `Domain` no cookie,
  sem `COOKIE_DOMAIN`. Menos configuração = menos jeito de errar.
- Em dev, o `rewrites()` do Next faz o mesmo (`/api/*` → `localhost:3001`).

## Estrutura de monorepo

```
apps/
  web/            # Next.js — frontend (SSR das telas, PWA, chama a API)
  api/            # NestJS — backend (regra de negócio, acesso a dado, jobs)
packages/
  shared/         # schemas Zod compartilhados (contrato de request/response)
  config/         # tsconfig, eslint compartilhados
```

pnpm workspaces + Turborepo, igual ao `pdv-web`. Escopo de pacote: `@gastos/*`.

## Isolamento entre usuários (a decisão central)

Equivalente do multi-tenant do PDV, com `userId` no lugar de `tenantId`:

1. Toda tabela de domínio tem `userId`.
2. **Camada de aplicação**: todo método de `Repository` recebe `userId`
   obrigatório, vindo do contexto da request (`AsyncLocalStorage`, decorator
   `CurrentUser`) — nunca escolhido pelo Controller, nunca opcional.
3. **Camada de banco (RLS)**: policies `user_isolation` com `FORCE ROW LEVEL
SECURITY`; a extensão do Prisma roda cada operação numa transação com
   `set_config('app.user_id', <user da request>, true)`. A API conecta como
   usuário **sem superusuário e sem BYPASSRLS** (`infra/postgres/init-app-role.sh`).
4. Jobs em background (sync, insights) **não têm request**: rodam por usuário,
   um de cada vez, declarando o `userId` explicitamente (`userStorage.run`) e
   com o `await` da query DENTRO do callback (mesma pegadinha documentada no
   `pdv-web`, spec 08 § 1).

Ver [08-seguranca](./08-seguranca.md) § 1 para o teste obrigatório.

## Módulos da API

```
auth          # login, sessão, 2FA, convite, redefinir senha
user          # perfil, configurações (renda fixa, meta de poupança)
person        # eu + familiares
account       # contas/cartões/carteiras
transaction   # compras no cartão: classificação, divisão (só contas `CREDIT_CARD`)
category      # categorias
rule          # regras de categoria/pessoa
budget        # orçamento mensal, envelopes, alertas
statement     # visão da fatura: total, não é meu, a classificar, meu
import        # OFX/CSV
banking       # integração Pluggy: connect token, items, sync, webhook
insight       # relatórios e detecções determinísticas
ai            # categorização, resumo, chat (chama Claude)
health        # GET /health
```

Detalhe de estrutura de pastas em [04-padroes-codigo](./04-padroes-codigo.md).

## Fluxo de sincronização bancária

1. Usuário abre o widget Pluggy Connect (front recebe um **connect token** de
   vida curta gerado pela API — credencial do banco só passa pelo widget do
   Pluggy, nunca pela nossa API).
2. Ao concluir, o front informa o `itemId`; a API valida (consulta o Pluggy)
   e guarda `PluggyItem` (userId, itemId, instituição, status, expiração do
   consentimento).
3. Job de sync (diário + botão "atualizar agora" + webhook do Pluggy) busca
   contas e transações do item, faz **upsert idempotente** por
   `(accountId, externalId)`, e, só nas contas de cartão de crédito, roda o
   pipeline de categoria/pessoa.
4. Erro ou consentimento perto de vencer vira aviso no app e e-mail.

Detalhe em [07-integracao-bancaria](./07-integracao-bancaria.md).

## Jobs em background

`@nestjs/schedule` no próprio processo da API (v1, um usuário/dois): sync
diário, detecção de assinaturas/anomalias, checagem de consentimento. Jobs
são idempotentes e protegidos por lock em banco (`pg_advisory_lock`) para não
rodar em dobro se o container reiniciar no meio. Se crescer, vira worker
próprio — mesma decisão de evolução do `pdv-web`.

## Ambientes e deploy

VPS própria, tudo via Docker Compose (`caddy`, `web`, `api`, `postgres`) —
sem PaaS, sem Supabase/Vercel, igual ao `pdv-web`. Deploy por push na `main`
via GitHub Actions + SSH, com `deploy-check.sh` e health check pós-deploy.
Runbook em [09-operacao](./09-operacao.md).
