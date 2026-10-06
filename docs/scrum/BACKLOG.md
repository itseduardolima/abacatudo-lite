# Product Backlog

Gerado a partir de [`../specs/`](../specs/) (regras em
[`03-regras-negocio.md`](../specs/03-regras-negocio.md)). Estimativas em Story
Points (Fibonacci: 1, 2, 3, 5, 8) — referência inicial, recalibrar depois da
Sprint 1.

**Escopo do produto:** só **compra no cartão** é gerenciada (categoria,
pessoa, orçamento, relatórios, IA). Pix e contas são só consulta, numa área
separada (Épico 5). Ver `03-regras-negocio.md` § Escopo.

Prioridade: **P0** bloqueia o MVP (importar extrato, classificar, ver o mês),
**P1** é necessário para uso real diário, **P2** melhora depois.

## Personas

- **Dono** — usa no celular quase todo dia: classifica gasto, vê se está no
  limite, empresta cartão para a família e quer ver só o que é dele.
- **Convidado** — outra pessoa com conta própria e dados totalmente
  separados. Mesmas telas, mesma regra; não enxerga nada do Dono.

---

## Épico 0 — Fundação técnica

- ⬜ 0.1 Monorepo pnpm + Turborepo, `packages/config`, `packages/shared` — **P0**
- ⬜ 0.2 `apps/api` bootstrap: `AsyncLocalStorage` de user, `AuthGuard`, `DomainError` + filtro, Prisma, throttler global, `/health` — **P0**
- ⬜ 0.3 `apps/web` bootstrap: Next.js + Tailwind (tokens), `api-client`, Cypress — **P0**
- ⬜ 0.4 Dockerfiles + `docker-compose` rodando local (`web`, `api`, `postgres`) — **P0**
- ⬜ 0.5 CI (lint + typecheck + test + build + `pnpm audit` em todo PR) — **P0**
- 🟡 0.6 **Spike Pluggy** (catálogo e custo resolvidos em 2026-09-21; falta criar o primeiro item com o Meu Pluggy — ver 07): conta dev, catálogo real de conectores (Nubank, BB, PicPay, InfinitePay, Bee Vale), plano/limites para 1–2 usuários; registrar em `07-integracao-bancaria.md` — **P0** (define o resto)
- ✅ 0.7 Protótipo das telas-chave **no estilo Wise** (23 telas mobile + 11 desktop) (ver `06-design-system-temas.md` e `apps/web/docs/DESIGN_SYSTEM.md`) — **P0** para o frontend

## Épico 1 — Usuários e autenticação

| #   | HU                                                                                                        | Critérios de aceite                                                                                                                                                                                                                                                                               | Pts | P   |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 1.1 | Como Dono, quero **isolamento por usuário no banco (RLS)**, para que um bug nunca vaze dado entre contas. | `FORCE RLS` em toda tabela de domínio; API sem superusuário; teste com 2 Users prova zero vazamento; sem `app.user_id` → 0 linhas; tabelas de autenticação (`User`/`Invite`/`Session`/`PasswordReset`) **sem** RLS, acessadas só pelo `AuthRepository` (lint) e cobertas pelo teste de isolamento | 5   | P0  |
| 1.2 | Como Dono, quero entrar com e-mail e senha, para acessar meus dados.                                      | argon2id; senha >= 12 chars e fora da lista de comuns; erro genérico; rate limit 5/15min por e-mail e IP; cookie `__Host-` com todos os flags                                                                                                                                                     | 5   | P0  |
| 1.3 | Como Dono, quero sessão que expira por inatividade e que eu possa encerrar.                               | 30 dias sem uso; logout revoga no servidor; trocar senha revoga as outras; lista de sessões em Configurações                                                                                                                                                                                      | 3   | P0  |
| 1.4 | ~~Como Dono, quero **convidar uma pessoa**, para ela ter conta própria.~~                                 | **Fora do escopo (2026-09-21): uso individual.** Se voltar, exige que a pessoa tenha o próprio Meu Pluggy                                                                                                                                                                                         | —   | —   |
| 1.5 | Como usuário, quero redefinir a senha.                                                                    | Link 1h uso único; `204` sempre; throttle próprio                                                                                                                                                                                                                                                 | 3   | P1  |
| 1.6 | Como usuário, quero ligar **2FA (TOTP)** com códigos de recuperação.                                      | Segredo criptografado; 10 códigos hash; janela ±1; sem reuso do código; app cobra até ligar                                                                                                                                                                                                       | 5   | P1  |
| 1.7 | Como usuário, quero reautenticar antes de ação sensível.                                                  | `RecentAuthGuard` (5 min) em conectar/desconectar banco, exportar, excluir conta, desligar 2FA                                                                                                                                                                                                    | 3   | P1  |
| 1.8 | Como usuário, quero **exportar** e **excluir minha conta**.                                               | Export CSV/JSON com neutralização de fórmula; exclusão apaga tudo + revoga Items; irreversível com confirmação                                                                                                                                                                                    | 5   | P1  |
| 1.9 | Como revendedor/dono, quero criar o primeiro usuário por seed.                                            | Seed idempotente por e-mail (`SEED_USER_*`), cria `Person` self e categorias padrão                                                                                                                                                                                                               | 2   | P0  |

## Épico 2 — Contas e pessoas

| #   | HU                                                                                     | Critérios de aceite                                                                                                                        | Pts | P   |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- | --- |
| 2.1 | Como Dono, quero cadastrar contas e cartões.                                           | Tipos `CREDIT_CARD` (gerenciada) / `CHECKING` (conta, débito) / `CASH`; origem `MANUAL`/`IMPORT`/`PLUGGY`; fechamento/vencimento no cartão | 3   | P0  |
| 2.2 | Como Dono, quero cadastrar **pessoas** (familiares).                                   | `Person` self automática e não removível; arquivar em vez de apagar quando tem histórico                                                   | 2   | P0  |
| 2.3 | Como Dono, quero mapear **cartão adicional/virtual** (últimos 4 dígitos) a uma pessoa. | `CardHolderHint`; transações do cartão chegam já com a pessoa                                                                              | 3   | P1  |
| 2.4 | Como Dono, quero gerenciar categorias.                                                 | Padrão do seed; criar/renomear/arquivar; nome único por User                                                                               | 2   | P0  |

## Épico 3 — Lançamentos, import e entrada manual

| #   | HU                                                                     | Critérios de aceite                                                                                                                          | Pts | P   |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 3.1 | Como Dono, quero **importar OFX/CSV** de qualquer conta.               | <= 5 MB, só memória; parser com limites/sem XXE; **pré-visualização** (novas/existentes/parecem transferência); idempotente por `FITID`/hash | 8   | P0  |
| 3.2 | Como Dono, quero **mapa de colunas** salvo por conta para CSV.         | Primeiro import mapeia; próximos são 1 toque                                                                                                 | 3   | P1  |
| 3.3 | Como Dono, quero lançar gasto/renda **manualmente**.                   | Valor, data, conta, descrição, categoria, pessoa; só em contas `MANUAL`/`IMPORT`                                                             | 3   | P0  |
| 3.4 | Como Dono, quero listar e filtrar as **compras no cartão de crédito**. | Só contas `CREDIT_CARD`; filtros cartão/pessoa/categoria/mês/busca; paginação; ordenação por allowlist                                       | 3   | P0  |
| 3.5 | Como sistema, quero calcular "mês" e "dia" em `America/Manaus`.        | Teste: compra 23h30 do dia 31 fica no mês certo                                                                                              | 2   | P0  |

## Épico 4 — Classificação (meu x não é meu) — só compras no cartão

| #   | HU                                                                                 | Critérios de aceite                                                                                                    | Pts | P   |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 4.1 | Como Dono, quero **corrigir a pessoa** de uma transação em **1 toque**.            | Toda transação nasce "Meu" (padrão); trocar pra pessoa/`Dividir` em 1 toque; sem fila de pendência                     | 3   | P0  |
| 4.2 | Como Dono, quero "**sempre para este estabelecimento**" ao classificar.            | Cria `Rule`; reaplica só nas não confirmadas; nunca sobrescreve confirmada                                             | 5   | P0  |
| 4.3 | Como Dono, quero classificar **em lote**.                                          | Multi-seleção + uma pessoa/categoria                                                                                   | 3   | P1  |
| 4.4 | Como Dono, quero **dividir** uma compra entre pessoas.                             | Soma dos splits = total (API rejeita se não fechar); "dividir igual" distribui o resto de centavos; preview vem da API | 5   | P0  |
| 4.5 | Como Dono, quero categorização automática (regras + histórico do estabelecimento). | Pipeline da 03; confirmada é intocável; corrigir oferece regra                                                         | 5   | P0  |
| 4.6 | Como Dono, quero gerenciar minhas regras.                                          | Listar/editar/desativar; prioridade por especificidade                                                                 | 3   | P1  |
| 4.7 | Como Dono, quero sugestão de pessoa por padrão consistente (>= 3 iguais).          | Só sugere, não aplica                                                                                                  | 2   | P2  |

## Épico 5 — Movimentações (Pix e contas) — área separada

Só consulta. Sem categoria, pessoa, orçamento, relatório ou IA. Regra em
`03-regras-negocio.md` § Movimentações.

| #   | HU                                                                                       | Critérios de aceite                                                                                                                                                                                                    | Pts | P   |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 5.1 | Como sistema, quero **separar cartão de crédito de movimentações** pelo tipo da conta.   | Só `CREDIT_CARD` é gerenciada; `TransactionRepository` só devolve compras dela e `MovementRepository` o resto; import exige escolher o tipo; teste provando que débito/Pix nunca entram em categoria, orçamento nem IA | 2   | P0  |
| 5.2 | Como Dono, quero ver o **extrato de débito, Pix e contas** numa tela separada.           | `/movements` só devolve lançamentos de contas não `CREDIT_CARD`; filtros conta/entrada-saída/mês; busca por contraparte; categoria/pessoa/split rejeitados (`422`)                                                     | 3   | P1  |
| 5.3 | Como Dono, quero **totais de entrada e saída do mês** nas movimentações.                 | Rotulados "não entram no orçamento"; nenhum total daqui alimenta orçamento/relatório                                                                                                                                   | 2   | P1  |
| 5.4 | Como Dono, quero o rótulo **"transferência entre suas contas"** e "pagamento de fatura". | Mesmo valor, sentidos opostos, contas do próprio User, <= 2 dias; ambíguo não rotula; não altera nenhum total                                                                                                          | 5   | P2  |
| 5.5 | Como Dono, quero uma **nota opcional** por movimentação.                                 | Texto puro, escapado; só nota, sem categoria                                                                                                                                                                           | 1   | P2  |

## Épico 6 — Fatura só com a minha parte

Decisão de produto: **sem** valor a receber, saldo ou abatimento; a cobrança é
só uma mensagem manual (6.3-6.5). O gasto de terceiros é subtraído. Regra em `03-regras-negocio.md` § "Só a minha
parte".

| #   | HU                                                                                             | Critérios de aceite                                                                                            | Pts | P   |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --- | --- |
| 6.1 | Como Dono, quero ver a **fatura com o desconto do que não é meu** e o valor "Meu" em destaque. | Total − Não é meu = Meu; invariante testada centavo a centavo; split conta só a fatia do self                  | 5   | P0  |
| 6.2 | Como Dono, quero o **"Meu" do mês** (todos os cartões) alimentando o orçamento.                | Só compra no cartão de self/fatia self; terceiros e Pix fora de totais e relatórios                            | 3   | P0  |
| 6.3 | Como Dono, quero dar um **nome na fatura** a uma compra (ex.: "Air fryer").                    | Vale para todas as parcelas da compra; sync não sobrescreve; texto puro 1-60 caracteres                        | 3   | P1  |
| 6.4 | Como Dono, quero o **texto da conta de cada pessoa** do mês, pronto.                           | Total, compras, `n/N`, "última", seção por cartão, "Pagar até dia X"; split só a fatia; Meu + pessoas = fatura | 5   | P1  |
| 6.5 | Como Dono, quero **enviar a conta pelo WhatsApp** ou copiar, com um clique meu.                | `wa.me/?text=` sem número; nada é enviado sozinho nem registrado; "Copiar texto" se o link for grande          | 3   | P1  |

## Épico 7 — Orçamento mensal

| #   | HU                                                                                    | Critérios de aceite                                                                                                                             | Pts | P   |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 7.1 | Como Dono, quero informar renda, gastos fixos e meta de poupança → **teto variável**. | Valores **informados** (Pix não é rastreado); fórmula da 03; centavos                                                                           | 5   | P0  |
| 7.2 | ~~Como Dono, quero **envelopes por categoria**.~~ DESCARTADO (2026-09-25)             | Valor ou %; "Livre" mostra o não alocado                                                                                                        | 5   | P0  |
| 7.3 | ~~Como Dono, quero **alertas** em 70/90/100%.~~ DESCARTADO (2026-09-25)               | Cada limiar dispara uma vez por mês por envelope; entra só compra no cartão de self; exclui pagamento de fatura, terceiros, Pix e a classificar | 5   | P0  |
| 7.4 | Como Dono, quero o **ritmo** (quanto por dia ainda posso gastar).                     | `restante ÷ dias restantes` sobre o teto; gasto = fatura aberta + gastos fixos                                                                  | 3   | P1  |
| 7.5 | Como Dono, quero ver **parcelas futuras** já comprometidas.                           | Soma por mês; não entra no mês corrente; navegável como **fatura prevista** por cartão (Home e Fatura), parcelas lançadas e estimadas           | 3   | P1  |
| 7.6 | Como sistema, quero **congelar** meses fechados.                                      | Mudar renda hoje não reescreve o passado                                                                                                        | 3   | P1  |

## Épico 8 — Integração bancária (Pluggy)

| #   | HU                                                                              | Critérios de aceite                                                                                                                                                                                            | Pts | P   |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 8.1 | Como Dono, quero **conectar um banco** pelo widget do Pluggy.                   | Connect token curto (reauth); `itemId` verificado no Pluggy e do próprio User; credencial nunca passa pela API                                                                                                 | 8   | P0  |
| 8.2 | Como sistema, quero **sincronizar** contas e transações com upsert idempotente. | `(accountId, externalId)` único; janela `lastSyncAt − 7d`; pendente→lançada preserva classificação; resposta do Pluggy validada por Zod                                                                        | 8   | P0  |
| 8.3 | Como Dono, quero sync **diário e manual**.                                      | Job com `pg_advisory_lock`; manual 1 por conta/15 min; **sem webhook** (o Meu Pluggy não tem; webhook fica P2, só se houver plano pago)                                                                        | 5   | P0  |
| 8.4 | Como Dono, quero **aviso de reconectar**.                                       | Dado que vem vazio de repente vira "reconectar", nunca "sem gastos"; aviso 30/7 dias só se o item trouxer data de expiração; "reconectar" é um PATCH no mesmo item e mantém o `Account`; nunca apaga histórico | 5   | P1  |
| 8.5 | Como Dono, quero **desconectar** um banco.                                      | Revoga Item; histórico permanece; contas marcadas desconectadas                                                                                                                                                | 3   | P1  |
| 8.6 | Como Dono, quero ver "**última atualização**" por conta.                        | Dado velho nunca parece atual; falha parcial não mostra total como completo                                                                                                                                    | 2   | P0  |

## Épico 9 — Relatórios e insights (determinísticos, só cartão)

| #   | HU                                                                                      | Critérios de aceite                                                       | Pts | P   |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --- | --- |
| 9.1 | Como Dono, quero ver **para onde vai meu dinheiro** (categoria/estabelecimento/pessoa). | Mês a mês; variação vs. anterior e vs. média dos 3 meses                  | 5   | P0  |
| 9.2 | Como Dono, quero detectar **assinaturas/recorrências**.                                 | Mesmo merchant, ±10%, ~30 dias ±4, >= 3 ocorrências; total mensal e anual | 5   | P1  |
| 9.3 | Como Dono, quero alerta de **cobrança duplicada**.                                      | Mesmo merchant+valor em 24h                                               | 2   | P1  |
| 9.4 | Como Dono, quero saber **categorias acima do normal**.                                  | > 140% da média dos 3 meses (mín. 3 meses de histórico)                   | 3   | P1  |
| 9.5 | Como Dono, quero **"onde economizar"** com o cálculo à mostra.                          | Ranking por potencial; cada item liga ao relatório de origem              | 5   | P1  |

## Épico 10 — IA

| #    | HU                                                                                   | Critérios de aceite                                                                                                 | Pts | P   |
| ---- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --- | --- |
| 10.1 | Como Dono, quero **sugestão de categoria por IA** para o que as regras não resolvem. | JSON validado; abaixo do limiar vira sugestão; nunca sobrescreve confirmada; cache por merchant; funciona desligada | 5   | P1  |
| 10.2 | Como Dono, quero um **resumo mensal** com sugestões de economia.                     | Só usa pacote de fatos calculado; cache por hash dos fatos; sem número inventado                                    | 5   | P1  |
| 10.3 | Como Dono, quero **perguntar** sobre meus dados em linguagem natural.                | Tool use somente-leitura; `userId` injetado pelo servidor; limite de linhas e de rodadas; sem efeito colateral      | 8   | P2  |
| 10.4 | Como Dono, quero **orçamento de tokens** e liga/desliga.                             | `AI_MONTHLY_TOKEN_BUDGET`; ao estourar, pausa com mensagem; rate limit próprio                                      | 3   | P1  |
| 10.5 | Como sistema, quero defesa contra **injeção via descrição de transação**.            | Dado delimitado; testes com texto malicioso; saída como texto                                                       | 3   | P1  |

## Épico 11 — PWA e privacidade

- ⬜ 11.1 PWA instalável (manifest; **ícones já em `brand/`**), cache de assets e último mês; limpar no logout — **P1** (3)
- ⬜ 11.2 "Ocultar valores" (tema claro no v1; **tema escuro** exige desenho próprio, fica **P2**) — **P1** (3)
- ⬜ 11.3 Estados vazios/carregando/erro em todas as telas — **P1** (3)

## Épico 12 — Produção e operação

- ⬜ 12.1 `GET /health` com `SELECT 1` + uptime externo — **P0 para produção** (2)
- ⬜ 12.2 Backup diário criptografado com chave pública (age), credencial só de escrita, retenção por lifecycle do bucket, fora da VPS + **drill de restore** — **P0 para produção** (3)
- ⬜ 12.3 Deploy via CI (SSH) + health check pós-deploy — **P1** (3)
- ⬜ 12.4 Redaction de log + alerta de sync parado — **P1** (3)
- ⬜ 12.5 Checklist do primeiro deploy (webhook do Pluggy só se houver plano pago) — **P1** (2)
- ⬜ 12.6 Rotação de `DATA_ENCRYPTION_KEY` implementada e ensaiada — **P2** (5)
