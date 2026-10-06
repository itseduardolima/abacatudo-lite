# Padrões de Código

Mesmos padrões do `pdv-web` (`../pdv-web/docs/specs/04-padroes-codigo.md`).
As regras duras abaixo são idênticas — repetidas aqui porque este arquivo
precisa ser lido sozinho. O que muda é o vocabulário de domínio e os módulos.

## Estrutura de pastas — `apps/api` (NestJS)

```
apps/api/src/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts          # login, sessão, 2FA, convite, redefinir senha
      dto/
    account/
      account.module.ts
      account.controller.ts
      account.service.ts
      account.service.spec.ts
      account.repository.ts
      dto/
    transaction/  person/  category/  rule/  budget/
    statement/    import/  banking/   insight/  ai/     user/   health/
      (mesma forma)
  common/
    guards/
      auth.guard.ts             # global; @Public() abre exceções
      recent-auth.guard.ts      # exige reautenticação (ação sensível)
    decorators/
      current-user.decorator.ts
      public.decorator.ts
    errors/
      domain.error.ts           # DomainError + subclasses (NotFound, Conflict, Forbidden)
    filters/
      domain-exception.filter.ts
    crypto/
      data-encryption.ts        # AES-256-GCM (tokens de item, segredo TOTP)
    user-context.ts             # AsyncLocalStorage do user da request/job
  prisma/
    prisma.module.ts
    prisma.service.ts
    prisma.client.ts            # extensão que seta app.user_id (RLS)
  main.ts
prisma/
  schema.prisma
  seed.ts
  migrations/
```

Regra por módulo: **Controller nunca fala com o Prisma.** `Controller`
recebe o DTO validado → `Service` (regra de negócio) → `Repository` (acesso a
dado, sempre user-scoped). Módulos `banking` e `ai` têm ainda um **client**
(`pluggy.client.ts`, `claude.client.ts`) que é o único lugar que chama o
serviço externo — o `Service` o recebe por injeção e o teste o mocka.

## Estrutura de pastas — `apps/web` (Next.js)

```
apps/web/src/
  app/
    (public)/login/  (public)/invite/[token]/  (public)/forgot-password/
    (app)/
      page.tsx                  # início: mês atual (orçamento, ritmo, avisos)
      inbox/                    # "a classificar"
      transactions/
      accounts/
      people/[id]/              # compras de uma pessoa (informativo)
      budget/
      reports/
      assistant/                # chat da IA
      settings/
      layout.tsx                # shell: bottom-nav no celular, sidebar no desktop
  components/
    ui/                         # primitivos: Button, Input, Sheet, Toggle...
    finance/                    # MoneyText, TransactionRow, PersonChip, EnvelopeBar...
    charts/                     # gráficos (paleta da skill dataviz)
    layout/                     # AppShell, BottomNav, Sidebar
  hooks/
    queries/                    # TanStack Query — um arquivo por recurso/ação
    use-*.ts                    # hooks compartilhados não-query
  lib/
    api-client.ts
    utils/                      # funções puras: format-money.ts, format-date.ts...
  styles/
    theme.css
    globals.css
```

`apps/web` não acessa banco nem serviço externo (Pluggy, Claude): só a API.
O único código de terceiro no browser é o widget Pluggy Connect, que recebe
um connect token de vida curta emitido pela API.

## Separação de lógica e UI (frontend) — regra dura

Idêntica ao `pdv-web`:

1. **`page.tsx` é só view.** Nenhum `useState`/`useQuery`/handler/cálculo
   direto nele.
2. **Hook de página** colocado ao lado (`use-inbox-page.ts`): só
   orquestração e estado local de UI; **nunca busca dado sozinho**.
3. **Hook de dado** em `hooks/queries/` (sempre TanStack Query): quem chama a
   API. Um arquivo por recurso/ação (`use-transactions.ts`,
   `use-classify-transaction.ts`).
4. **Hook compartilhado não-query** em `hooks/`.
5. **Nenhuma função solta dentro de componente.** Função pura vai para
   `lib/utils/`; se depende de hook do React, é hook.
6. **Cálculo de dinheiro não existe no frontend.** Totais, saldos, limites,
   rateios e percentuais de orçamento vêm da API prontos; o front só formata
   (`format-money.ts`).

## Formulários — validação é sempre do backend

Idêntico ao `pdv-web`: schemas Zod de `packages/shared` só **tipam**
(`z.infer`); o front nunca roda `.parse()`/`.safeParse()` para bloquear um
submit, nunca escreve mensagem de erro própria; React Hook Form sem
resolver; `400 VALIDATION` traz `details.fieldErrors` mapeado por campo; erro
de regra chega com `message` em português pronta para exibir.

## Idioma

Código em inglês; texto ao usuário, docs e comentários em português.
Vocabulário fixo de domínio:

| Negócio (PT)              | Código (EN)                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Usuário                   | `User`                                                                                         |
| Pessoa (eu / familiar)    | `Person` (`isSelf`)                                                                            |
| Conta / cartão / carteira | `Account` (`type`: `CREDIT_CARD` \| `CHECKING` \| `CASH`)                                      |
| Lançamento                | `Transaction` (`direction`: `IN` \| `OUT`)                                                     |
| Tipo do lançamento        | `kind`: `EXPENSE` \| `INCOME` \| `TRANSFER` \| `REFUND` \| `CARD_PAYMENT`                      |
| Categoria                 | `Category`                                                                                     |
| Regra                     | `Rule`                                                                                         |
| Divisão de compra         | `Split`                                                                                        |
| A classificar             | `inbox` (transação com `personId = null`)                                                      |
| Meu / não é meu           | `mine` / `notMine` (`Statement`: `totalCents`, `notMineCents`, `unassignedCents`, `mineCents`) |
| Orçamento / envelope      | `Budget` / `Envelope`                                                                          |
| Renda                     | `income`                                                                                       |
| Conexão bancária (Pluggy) | `PluggyItem`                                                                                   |
| Consentimento             | `consent` (`consentExpiresAt`)                                                                 |
| Assinatura / recorrência  | `recurring`                                                                                    |

Comentários: mínimos, em português, no máximo 1 linha, só quando o código não explica sozinho um porquê
não óbvio (uma invariante, uma pegadinha). Nunca parafrasear o que a linha já diz.

## Commits

- Conventional Commits **em inglês**: `type(scope): description`, no imperativo, em minúscula, sem ponto
  final (`feat(api/transaction): add split endpoint`). Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`,
  `build`, `ci`, `test`, `style`. O escopo é o app ou módulo afetado.
- **Vários commits, um por assunto** (docs, tooling, cada pacote ou app, docker, scripts, ci). Nunca uma
  mudança inteira num commit só.
- **Sem `Co-authored-by` e sem citar modelo ou IA** em mensagem de commit ou de PR.
- Autor deste repositório: `itseduardolima <eduardolima2417@gmail.com>`, configurado só localmente
  (`git config --local`); a configuração global da máquina não é usada aqui.
- Nunca `--no-verify`: o pre-commit (Prettier via lint-staged) precisa rodar.

## Nomenclatura

- Classes Nest: singular com sufixo (`TransactionService`,
  `TransactionRepository`). Componentes React: `PascalCase.tsx`. Util:
  `kebab-case.ts`. DTOs via `createZodDto` sobre schema de `packages/shared`.
- Dinheiro: sempre centavos inteiros, sufixo `Cents` (`amountCents`,
  `creditLimitCents`) — nunca `number` decimal. Percentual como inteiro em
  pontos-base (`thresholdBps`) ou inteiro de 0–100 documentado no schema.
- Timestamps com sufixo `At`. Datas de "dia contábil" como `date` (sem hora)
  quando o banco só informa o dia.

## TypeScript

- `strict: true`, **sem `any`** em nenhum arquivo (nem teste) — ESLint
  `no-explicit-any: error` na config base. Desconhecido é `unknown` com
  narrowing; forma conhecida é tipo declarado ou derivado (`z.infer`,
  `Prisma.XGetPayload`).
- **Resposta de API externa (Pluggy, Claude) é `unknown` até passar por
  schema Zod.** Nunca confiar no formato: o schema fica no `client` e o resto
  do código só vê o tipo já validado.
- Erros de regra são `DomainError` com `code` estável em inglês
  (`SPLIT_SUM_MISMATCH`, `TRANSFER_AMBIGUOUS`, `RECENT_AUTH_REQUIRED`) e
  `message` em português, mapeados para HTTP por um filtro global.
- `$queryRawUnsafe`/`$executeRawUnsafe` **proibidos**.

## Testes

Backend (`apps/api`), Jest:

- `*.service.spec.ts` com `Repository` mockado: **toda regra de
  [03-regras-negocio](./03-regras-negocio.md) precisa de teste unitário** —
  escopo por tipo de conta (só `CREDIT_CARD` é sincronizada e gerenciada),
  rejeição de categoria/pessoa/split fora do cartão, rateio que fecha em
  centavos, invariante da fatura (`Fatura = Meu + Não é meu + A classificar`), envelope/alerta uma vez por
  mês, detecção de assinatura, fuso (compra 23h30 do dia 31).
- **Teste de isolamento obrigatório por módulo**: cria dado para dois Users e
  prova que a query de um nunca devolve o do outro (08 § 1) — é Definition of
  Done, não opcional.
- Clients externos (`PluggyClient`, `GroqClient`) sempre mockados nos
  testes; **nenhum teste chama serviço externo real**.
- `*.controller.spec.ts`: integração leve (DTO + roteamento).

Frontend (`apps/web`), Cypress:

- Component Testing para `components/ui` e `components/finance`
  (`TransactionRow`, `PersonChip`, `EnvelopeBar`, `SplitEditor`).
- E2E dos fluxos críticos contra API real de teste com a integração Pluggy
  **substituída por fixture** (nunca bater no Pluggy real no CI): login →
  importar extrato → classificar → ver orçamento.

## O que NÃO fazer

- Não escrever query Prisma em Controller nem acessar banco a partir do
  `apps/web`.
- Não deixar `userId` opcional em `Repository`.
- Não calcular dinheiro no frontend nem no LLM.
- Não guardar token/segredo em texto puro no banco; não logar corpo de
  request de login nem resposta do Pluggy com dado de conta.
- Não introduzir abstração sem segundo caso real (ex.: "motor de regras"
  genérico — `Rule` é uma tabela simples com poucos campos).
