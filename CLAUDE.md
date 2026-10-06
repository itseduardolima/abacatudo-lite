# gastos-web (AbacaTudo)

> **Leia [`TODO.md`](./TODO.md) antes de qualquer outra coisa.** É o
> checklist vivo do projeto — o que já está feito e o que falta, por
> sprint. Toda sessão que trabalhar aqui lê esse arquivo primeiro e o
> atualiza (marca `[x]`, adiciona linha nova) antes de terminar. Sem isso,
> trabalho duplicado ou fora de ordem é praticamente garantido.

Sistema web (PWA, uso principal no celular) de gestão de gastos pessoais:
puxa cartões/contas via Open Finance (agregador Pluggy), separa o que é do
dono do que é da família que usa o cartão dele, aplica limite mensal baseado
na renda, mostra onde gastar menos, e tem IA de apoio.

Projeto irmão de `../pdv-web` e **segue o mesmo padrão de arquitetura,
código e segurança dele** (monorepo pnpm + Turborepo, Next.js só frontend,
NestJS + Prisma + PostgreSQL, isolamento em duas camadas com RLS, VPS
própria com Docker Compose + Caddy). Em caso de dúvida sobre "como o
`pdv-web` faz isso", olhe lá primeiro. As diferenças deliberadas (multiusuário
em vez de multi-tenant, um domínio só, sem MinIO, integração bancária, IA)
estão nos specs.

## Antes de qualquer alteração, leia

Todo o contexto está em `docs/specs/`, nesta ordem:

1. `docs/specs/00-visao-geral.md` — o que é, por quê, fora de escopo
2. `docs/specs/01-arquitetura.md` — peças, isolamento por usuário, sync, jobs
3. `docs/specs/02-tecnologias.md` — stack e o que NÃO usar
4. `docs/specs/03-regras-negocio.md` — **fonte da verdade de comportamento**
   (escopo cartão x Pix, pessoas, classificação, fatura "só a minha parte", orçamento) — toda
   feature nova precisa ser consistente com isso ou atualizá-lo junto
5. `docs/specs/04-padroes-codigo.md` — estrutura de pastas, nomenclatura,
   vocabulário fixo, testes, commits
6. `docs/specs/05-componentizacao.md` — reuso de componentes, mobile-first
7. `docs/specs/06-design-system-temas.md` — decisões de design; tokens e
   componentes em `apps/web/docs/DESIGN_SYSTEM.md` (estilo Wise: Forest Ink +
   lima, pílulas; ler antes de qualquer UI). Protótipo das telas (23, mobile):
   https://claude.ai/artifact/CAyHffJCJ5wDrutNeEai1k, fonte em `../gastos-prototipo`
8. `docs/specs/07-integracao-bancaria.md` — Pluggy, webhooks, consentimento
9. `docs/specs/08-seguranca.md` — checklist de segurança — consultar antes de
   tocar em auth, sessão, cripto, upload, Pluggy, IA ou qualquer query
10. `docs/specs/09-operacao.md` — runbook (health, backup/restore, deploy,
    incidentes) — consultar antes de tocar em deploy, migration ou VPS
11. `docs/specs/10-ia.md` — uso da Claude API (o que a IA pode e não pode
    fazer) — consultar antes de tocar no módulo `ai`

Planejamento em `docs/scrum/`: `BACKLOG.md` (épicos e HUs) e `SPRINTS.md`
(ordem e Definition of Done). O **estado atual** é `TODO.md`, na raiz.

Se uma tarefa contradiz algo de `docs/specs/`, o spec vence — ou a tarefa é,
na verdade, "atualizar o spec" (avisar o usuário).

## Regras que valem sempre

- **Dado de um usuário nunca chega a outro.** Todo `Repository` recebe
  `userId` obrigatório do contexto da request/job; toda tabela de domínio tem
  RLS (`FORCE`); a API roda sem superusuário. Todo módulo novo entrega teste
  com dois Users. Nunca query Prisma em `Controller`, nunca banco em
  `apps/web`. (spec 08 § 1)
- **Dinheiro é inteiro em centavos (`...Cents`), nunca `number` decimal.**
  Mês e dia sempre em `America/Manaus`.
- **Dinheiro nunca é calculado no frontend nem pela IA.** Soma, saldo, limite,
  rateio, percentual de orçamento: backend, código determinístico, testado.
  A IA só classifica texto e narra números já prontos. (spec 10)
- **O sistema é somente leitura em relação aos bancos.** Nenhuma chamada de
  pagamento/Pix/iniciação no `PluggyClient`. Credencial de banco nunca
  passa pela nossa API (só pelo widget do Pluggy). (spec 07, 08 § 14)
- **Só compra no cartão de crédito é gerenciada.** Débito, Pix, TED, boleto,
  saque e benefício (VR/VA) são só consulta, em área separada (`movement`,
  `/movements`): sem categoria, pessoa, orçamento, relatório ou IA. O escopo é
  decidido só pelo **tipo da conta** (`CREDIT_CARD`), sem heurística por
  lançamento; `TransactionRepository` só devolve cartão de crédito e
  `MovementRepository` só o resto. Renda e gastos fixos são
  informados pelo usuário.
  (spec 03 § Escopo)
- **Gasto de terceiros no meu cartão é subtraído; a cobrança é só uma mensagem
  manual.** Não existe valor a receber, saldo por pessoa, "marcar pago" nem
  abatimento (decisão de produto); o User gera e envia o texto da conta pelo
  WhatsApp na mão, sem telefone guardado (spec 03 § Mensagem de conta). A
  fatura mostra total − não é meu − a classificar = **meu**, e vale a
  invariante `Fatura = Meu + Não é meu + A classificar` (spec 03).
- **Pagamento de fatura nunca é gasto** (as compras já entram uma a uma pelo
  cartão); a linha `CARD_PAYMENT` é excluída do gasto. (spec 03 § Movimentações)
- **Segredo/token só criptografado em repouso ou fora do banco; nunca em
  log, nunca no browser.** `DATA_ENCRYPTION_KEY` (AES-256-GCM) para o que
  precisa ficar no banco. Resposta de API externa é `unknown` até passar por
  schema Zod. (spec 08 § 9, 10)
- **`page.tsx` é só view.** Hook de página (colocado, só orquestra) / hook de
  dado em `hooks/queries/` (TanStack Query) / hook compartilhado em `hooks/`.
  Nenhuma função solta em componente: pura → `lib/utils/`. (spec 04)
- **Toda regra e toda mensagem de validação vêm do backend.** O front nunca
  roda `.parse()`/`.safeParse()` para bloquear submit nem inventa mensagem de
  erro — só exibe a da API. Erro nunca em toast. (spec 04 § Formulários)
- **Nunca usar `any`** em TypeScript, nem em teste. Desconhecido é `unknown`
  com narrowing. O ESLint falha.
- **Código em inglês, poucos comentários (em português), commits
  Conventional Commits em inglês.** Vocabulário fixo na seção Idioma do
  spec 04. Texto ao usuário em português.
- **Commits: vários, por assunto, nunca tudo junto.** Sem `Co-authored-by` e
  **sem citar modelo ou IA** em mensagem de commit ou de PR. Autor do
  repositório: `itseduardolima <eduardolima2417@gmail.com>` (config local,
  nunca a global da máquina). Nunca `--no-verify`. (spec 04 § Commits)
- **Nunca cor hardcoded em componente** — sempre token semântico de
  `styles/theme.css` (`bg-primary`, `text-ink`...). Lima **só como fundo** de
  ação/estado ativo (1,5:1 no branco: nunca texto nem traço); Pebble nunca
  como texto; display 900 só no número principal. (`DESIGN_SYSTEM.md`)
- **Construir por etapas.** Um módulo/feature por vez, validado (typecheck +
  testes) antes do próximo. Não scaffoldar vários módulos de uma vez.
- **Toda regra de negócio nova em `apps/api` tem teste unitário Jest no
  `Service` (Repository e clients externos mockados)** antes de ser
  considerada pronta. Nenhum teste chama Pluggy ou Claude de verdade.
- **Nunca commitar `.env`, chave ou dado bancário real** (nem em fixture de
  teste: usar dado sintético).

## Stack e topologia (resumo — detalhe em docs/specs)

Monorepo pnpm + Turborepo: `apps/web` (Next.js, só frontend/PWA), `apps/api`
(NestJS, toda regra e todo acesso a dado via Prisma/PostgreSQL),
`packages/shared` (schemas Zod), `packages/config`. Hospedagem: **VPS
própria**, Docker Compose (`caddy` + `web` + `api` + `postgres`), **um
domínio só** (`/api/*` → API, resto → web). Sem PaaS/BaaS (nada de Vercel,
Supabase, Railway). Integrações externas só do servidor: Pluggy (bancos) e
Claude API (IA).

## Comandos

```bash
pnpm install
pnpm dev              # turbo run dev (web + api em paralelo)
pnpm build
pnpm lint
pnpm typecheck
pnpm test             # Jest — apps/api/src/modules/**/*.spec.ts
pnpm --filter web cy:run        # Cypress component tests
pnpm --filter web cy:run:e2e    # Cypress E2E (Pluggy substituído por fixture)
pnpm --filter api db:generate   # Prisma Client (antes de tipar/testar a API)
pnpm --filter api db:migrate    # prisma migrate dev
pnpm --filter api db:studio
pnpm format                     # Prettier (a CI roda format:check)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres   # localhost:5433
docker compose up -d --build    # sobe tudo na VPS
```

## Estado atual do projeto

Sprint 0 concluída (exceto o spike do Pluggy, 0.6, que precisa de conta de desenvolvedor). No ar: monorepo
pnpm + Turborepo, `packages/shared` e `packages/config`, `apps/api` (NestJS: contexto de usuário, `AuthGuard`
global que falha fechado, `DomainError` + filtro sem vazamento, logger estruturado com redação, validação de
`.env`, extensão de RLS no Prisma, `/health`), `apps/web` (Next.js + Tailwind com os tokens, `api-client`, CSP
com nonce, `Button` e `MoneyText` com Cypress), Dockerfiles e stack completa testada (Caddy, web, API,
Postgres), CI (lint, tipos, testes, build, audit, componentes e build das imagens). Próximo passo: Sprint 1 —
isolamento por usuário (RLS + teste com 2 usuários) e login. Ver `TODO.md`.
