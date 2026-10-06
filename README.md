# gastos-web (AbacaTudo)

Gestão de gastos pessoais (PWA, celular primeiro): cartões e contas via Open
Finance (Pluggy), separação do que é seu do que é da família, limite mensal
baseado na renda, relatório de onde o dinheiro vai e IA de apoio.

Stack: Next.js (frontend) + NestJS + PostgreSQL, em monorepo pnpm + Turborepo.

## Documentação

| Onde                                               | O quê                                                |
| -------------------------------------------------- | ---------------------------------------------------- |
| [`TODO.md`](./TODO.md)                             | Checklist vivo por sprint                            |
| [`docs/specs/`](./docs/specs)                      | Visão, arquitetura, regras de negócio, segurança, IA |
| [`docs/scrum/BACKLOG.md`](./docs/scrum/BACKLOG.md) | Épicos e histórias de usuário                        |
| [`docs/scrum/SPRINTS.md`](./docs/scrum/SPRINTS.md) | Ordem das sprints e Definition of Done               |

## Estrutura

```
apps/web        # Next.js — frontend/PWA
apps/api        # NestJS — regra de negócio, Prisma, jobs, Pluggy, IA
packages/shared # schemas Zod (contrato de API)
packages/config # tsconfig/eslint compartilhados
```

## Desenvolvimento local

```bash
pnpm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:generate
pnpm dev
```

Web em `:3000`, API em `:3001` e Postgres em `localhost:5433`.

Verificações: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` e
`pnpm --filter web cy:run` (testes de componente).
