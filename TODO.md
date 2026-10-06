# TODO

Checklist vivo do projeto. **Toda sessão/agente que trabalhar neste
repositório precisa ler este arquivo primeiro** (é a primeira linha do
`CLAUDE.md`) e **atualizá-lo antes de terminar a sessão**: marcar `[x]` o que
foi concluído, adicionar linha nova se surgir trabalho não previsto, mover o
"Em andamento" para refletir onde o trabalho parou.

Detalhe de cada item (critério de aceite, pontos, prioridade) está em
[`docs/scrum/BACKLOG.md`](./docs/scrum/BACKLOG.md); a ordem por sprint em
[`docs/scrum/SPRINTS.md`](./docs/scrum/SPRINTS.md). Este arquivo é só o
estado — não duplique critério de aceite aqui, só referencie o número da HU.

Regra de marcação: só marque `[x]` quando bater a Definition of Done de
`docs/scrum/SPRINTS.md` (typecheck + testes + teste de isolamento com 2 Users,
sem conta de dinheiro no frontend) — não quando o código só "existe".

## Em andamento agora

- **Sprint 0 concluída em 2026-09-21**, incluindo o **spike do Pluggy (0.6)**, fechado com dado real (spec 07).
- **Sprint 1 concluída em 2026-09-22**: RLS (User/Session isentas, documentado), login por e-mail/senha,
  sessão de 30 dias com revogação, seed do primeiro usuário. Testado contra Postgres e API reais, e o
  fluxo de cookie testado num Chrome de verdade (não só curl). Gaps encontrados: ver seção da Sprint 1.
- **Sprint 2 em andamento (2026-09-22)**: contas, pessoas e categorias no ar (RLS, CRUD, testado contra
  API real e isolamento entre usuários). Import OFX/CSV (3.1) foi **pulado a pedido do usuário** — a fonte
  de dado passou a ser a API do Pluggy direto (3.1 fica pra trás de tudo, só se algum dia fizer falta).
  Lançamento manual (3.3) segue por último de propósito.
- **Integração Pluggy construída em 3 etapas nesta sessão (2026-09-22)**, a pedido do usuário
  ("faça etapa por etapa"): (1) models `Transaction`/`PluggyItem` + RLS, (2) `PluggyClient` (auth,
  retry/timeout, schemas Zod), (3) módulo `banking` (conectar, checar status por polling, sincronizar) e o
  par `TransactionRepository`/`MovementRepository` (5.1, 3.4 básico). Cobre 8.1/8.2/8.3 da Sprint 6, feitos
  fora de ordem porque o usuário pediu Pluggy antes de import/lançamento manual.
- **Verificado ao vivo, de ponta a ponta (2026-09-22)**: Docker recuperado (o Docker Desktop tinha travado
  sem gerar o socket; matei tudo e reabri limpo), API de pé contra o Postgres real, o usuário autorizou de
  verdade um Nubank real no Chrome, `checkStatus` detectou `UPDATED` e disparou o sync sozinho. **3 bugs
  reais achados e corrigidos** nesse teste (link OAuth assíncrono, paginação do cursor, categoria de
  pagamento de fatura) — ver "Bugs achados só ao rodar de verdade" da Sprint 6. Sprint 6 fecha 8.1/8.2/8.3
  de verdade agora; 5.1 e 3.4 (básico) também.
  Limpei o usuário/item de teste depois (no banco e no Pluggy) — banco de dev volta vazio.
- **Sprint 3 iniciada (2026-09-22) — Etapa 1 concluída**: model `Rule` + RLS, `PersonRepository.findSelf`,
  e o pipeline de atribuição de pessoa ligado no sync (toda transação nasce "Meu", `Rule` decide antes
  quando o estabelecimento bate). Achei e corrigi mais 1 bug ao testar: `merchant` nunca vinha preenchido
  porque o schema esperava `name` e o campo real do Pluggy é `businessName`. Verificado ao vivo: 1670
  transações sincronizadas sem nenhuma sem pessoa, e uma `Rule` de teste pra "Prime Video" roteou as 27
  transações certas pra outra pessoa enquanto o resto ficou "Eu". Faltam as Etapas 2-4 (endpoint pra
  corrigir pessoa + criar regra, `Split`, categorização automática).
- **Sprint 3 Etapa 2 concluída (2026-09-22)**: `PATCH /transactions/:id/person` corrige a pessoa de uma
  transação (só cartão — 404 em conta de movimentação); `alwaysForMerchant` cria/atualiza a `Rule` do
  estabelecimento normalizado, rejeita (`400 MERCHANT_REQUIRED_FOR_RULE`) se a transação não tiver
  merchant. Verificado ao vivo contra Postgres real: troca de pessoa, criação da `Rule` (linha conferida
  no banco), rejeição sem merchant, 404 em movimentação e em pessoa inexistente.
- **Sprint 3 Etapa 3 concluída (2026-09-22)**: model `Split` + RLS, `POST .../split/preview` (divisão igual
  calculada pela API, nunca no cliente — resto de centavos pros primeiros), `PUT .../split` (substitui os
  splits, exige soma exata, rejeita pessoa duplicada), `DELETE .../split` (desfaz, volta pro self).
  Corrigir a pessoa direto (`PATCH .../person`) também desfaz um split ativo. Verificado ao vivo contra
  Postgres real: os 6 cenários (preview, grava, soma errada, pessoa duplicada, desfazer, e desfazer via
  correção de pessoa) todos se comportaram certo.
- **Sprint 3 Etapa 4 concluída (2026-09-22) — Sprint 3 fechada**: `Rule` ganhou `categoryId` opcional (junto
  do `personId`, também opcional agora — pelo menos um dos dois preenchido, `CHECK` no banco), com
  `upsertPerson`/`upsertCategory` cada um mexendo só no seu campo. Sync resolve a categoria da mesma forma
  que a pessoa (Rule decide; sem Rule, "sem categoria" — não tem "padrão" pra categoria como tem pra
  pessoa). `PATCH /transactions/:id/category` corrige a categoria, com `alwaysForMerchant` criando/
  atualizando a `Rule`. Verificado ao vivo: correção, criação da regra (só `categoryId`, `personId` ficou
  null), 404 de categoria inexistente.
  **Gap consciente**: o pipeline do spec (03-regras-negocio § Categorias e regras) tem um item 3 "mesmo
  merchant já confirmado pelo usuário" (aprende sem precisar de `Rule` explícita) que não foi construído —
  precisaria decidir como distinguir categoria "confirmada pelo usuário" de categoria "herdada por sync",
  o que hoje não existe no schema. Registrado aqui pra decidir antes de expandir classificação.
- **Code review da Sprint 3 (2026-09-22)**: 2 achados, os dois corrigidos e verificados ao vivo — `preview`
  de split não validava pessoa duplicada como `replace` valida (agora os dois usam a mesma checagem);
  pessoa/categoria arquivada podia ser atribuída via `PATCH .../person`, `.../category` e o split
  (`findById` não filtrava `archivedAt` — criado `findActiveById`, usado só nesses endpoints de
  atribuição; `findById` puro continua igual pra não quebrar o fluxo de arquivar).
- **Sprint 4 concluída (2026-09-22)**: 2 bugs reais achados antes de construir — `resolveKind` mapeava todo
  `CREDIT` do Pluggy pra `REFUND`, mas numa conta de movimentação `CREDIT` é dinheiro entrando de verdade
  (agora `INCOME`, `REFUND` só em cartão); e o sync atribuía pessoa/categoria (via `Rule`) até em
  transação de movimentação, quando o spec diz que isso não existe lá (agora sempre `null` fora de
  cartão). `GET /movements` ganhou filtro de conta/direção/busca (5.2) e `GET /movements/totals` (5.3).
  Módulo `invoice` novo: `GET /invoice?accountId=&month=` (fatura por cartão, 6.1) e
  `GET /invoice/summary?month=` (Meu somado em todos os cartões, 6.2) — `computeInvoice` é função pura,
  testada isoladamente (estorno reduz o total, split conta só a fatia do self, `CARD_PAYMENT` nunca entra).
  Verificado ao vivo contra os 1670 dados reais sincronizados: totais batendo com o banco, e a invariante
  `Fatura = Meu + Não é meu` conferida à mão depois de reatribuir uma transação e depois de dividir outra.
- **Code review da Sprint 4 (2026-09-22)**: 2 achados, os dois corrigidos e verificados ao vivo — corrigir a
  pessoa direto gravava e desfazia o split em 2 chamadas separadas (uma falha no meio deixava split velho
  "escondido" que `computeInvoice` priorizava sobre a pessoa nova; virou 1 chamada atômica reaproveitando o
  `$transaction` que `SplitRepository` já tinha, renomeado pra `setSinglePerson`); a checagem de
  `accountId` obrigatório da fatura vivia solta no controller, sem teste — movida pro `InvoiceService`.
- **Sprint 5 iniciada (2026-09-22) — Etapa 1 concluída**: model `BudgetMonth` + RLS,
  `GET`/`PUT /budget/month?month=` (7.1). Virada de mês copia a config do mês mais recente já configurado;
  mês fechado (passado) é imutável (`422 BUDGET_MONTH_CLOSED` no PUT, GET devolve zero sem gravar nada).
  `variableCapCents` = renda + benefício − fixos − poupança, calculado, nunca guardado. Verificado ao vivo:
  os 5 cenários (criar zerado, gravar, virada copiando, rejeitar mês fechado, ler mês fechado sem linha
  nova) todos bateram.
- **Code review da Sprint 5 Etapa 1 (2026-09-22)**: 2 achados, os dois corrigidos e verificados ao vivo —
  `getOrCreate` criava linha persistida pra qualquer mês futuro só por ter sido perguntado num GET (ex.:
  `month=9999-12`), agora só cria pro mês atual/seguinte, o resto devolve zero sem gravar; e o
  find-then-create tinha uma race no `@@unique([userId, month])` (2 GETs concorrentes pro mesmo mês novo
  podiam derrubar um deles com 500) — virou `createIfMissing`, um upsert atômico com update vazio.
- **Sprint 5 Etapa 2 concluída (2026-09-22)**: model `Envelope` + RLS + CHECK
  (`amountCents` xor `percent`, exatamente um dos dois), `GET/POST/PATCH/DELETE
/budget/envelopes?month=` (7.2). `capCents` = valor fixo se tiver, senão
  percentual sobre `variableCapCents`, arredondado; `freeCents` da lista =
  teto variável − soma dos `capCents`. Verificado ao vivo: criar por valor
  fixo e por percentual, listar com soma/livre corretos, 409 categoria
  duplicada no mês, 400 os dois campos preenchidos, PATCH trocando de valor
  fixo pra percentual recalcula certo, DELETE recalcula `freeCents`, 422 mês
  sem orçamento configurado.
- **Code review da Sprint 5 Etapa 2 (2026-09-22)**: 1 achado, corrigido e
  verificado ao vivo — `create`/`update`/`remove` de envelope nunca
  checavam se o `BudgetMonth` relacionado já tinha fechado (passado); um
  envelope de um mês fechado continuava editável/removível/criável mesmo
  com a regra "mês fechado é imutável" já valendo pra `PUT /budget/month`.
  `BudgetMonthService` passou a exportar `assertMonthOpen`, reaproveitado
  pelas três mutações do Envelope; `list` continua liberado (histórico é
  só leitura).
- **Sprint 5 Etapa 3 concluída (2026-09-22)**: alertas de orçamento (7.3) e
  "última atualização" por conta (8.6).
  - Alertas: models `EnvelopeAlert`/`BudgetMonthAlert` (RLS + CHECK
    `threshold IN (70,90,100)`) — a linha existir É o "já disparou neste
    mês" (idempotente por `@@unique`, mesmo padrão do `createIfMissing`);
    envelope pertence a um único `BudgetMonth`, então virar o mês é um
    envelope novo com alertas zerados, sem precisar guardar o mês na
    própria linha do alerta. `AlertService` (dentro do módulo `budget`, como
    o 01-arquitetura já previa) calcula o gasto "Meu" do mês (só `EXPENSE`
    de cartão, nunca `REFUND`/`CARD_PAYMENT` — diferente da fatura, que
    neteia estorno) numa query só pro mês inteiro, separado por categoria;
    `GET /budget/envelopes` ganhou `spentCents`/`percentUsed`/
    `firedThresholds` por envelope e `totalSpentCents`/`totalPercentUsed`/
    `totalFiredThresholds` pro teto variável — o GET é quem registra
    (idempotente) os limiares batidos, não existe job/push separado ainda
    (fica pra quando a IA/notificação da Sprint 7 tiver algo pra consumir
    esse dado).
  - 8.6: `Account` ganhou `lastSyncAt` (do `PluggyItem` por trás dela, não
    campo próprio) — sempre `null` pra conta `MANUAL`/`IMPORT`; se um sync
    falhar no meio, o item nunca chega a atualizar `lastSyncAt` (ver
    `BankingService.runSync`), então dado velho nunca aparenta estar atual.
  - Verificado ao vivo: envelope de R$300 batendo 70% e depois 90% (sem
    duplicar o 70 já disparado, `firedAt` confirmado igual no banco), teto
    total não disparando fora de hora, isolamento entre 2 Users nas duas
    tabelas novas de alerta, e `lastSyncAt` vindo certo do `PluggyItem`
    numa conta marcada como `PLUGGY`.
- **Sprint 5 Etapa 4 concluída (2026-09-23) — Sprint 5 fechada**: "para onde vai
  o dinheiro" (9.1). Módulo `insight` novo (nome já previsto em
  01-arquitetura), `GET /insights/spending?month=` — mesmo escopo da fatura
  (só cartão, `EXPENSE`/`REFUND` netados, `CARD_PAYMENT` fora), agrupado por
  categoria, estabelecimento (normalizado como a `Rule` — "Loja X" e "loja x "
  no mesmo grupo) e pessoa (transação dividida: cada fatia vai pra pessoa
  dela, nunca a transação inteira pra uma só). Cada grupo traz variação vs.
  mês anterior e vs. média dos 3 meses anteriores a ele — mesma janela que
  "categoria acima do normal" (Sprint 7) vai usar; percentual vem `null`
  quando não há base pra comparar (mês/média zerada), nunca um número
  inventado a partir de zero. `shiftMonthKey` novo em `common/date/timezone`
  desloca um `monthKey` por N meses (reaproveitável pra qualquer relatório
  futuro com janela de meses). Só entram no relatório os grupos com gasto no
  mês pedido, ordenados do maior pro menor.
  Verificado ao vivo contra Postgres real: 4 meses de dado sintético (cartão
  com compra, estorno e uma divisão entre 2 pessoas), total batendo líquido
  de estorno e excluindo o pagamento de fatura, agrupamento por categoria/
  estabelecimento/pessoa conferido à mão (inclusive a divisão indo pra cada
  pessoa certa), variação vs. mês anterior e vs. média dos 3 anteriores
  batendo o cálculo manual (inclusive virada de ano), `400 INVALID_MONTH` em
  mês malformado, mês sem dado devolvendo tudo zerado, e isolamento entre 2
  Users confirmado com o papel restrito (`-U gastos`).
- **8.5 concluída (2026-09-23)**: `DELETE /banking/items/:id` desconecta —
  revoga o Item no Pluggy (melhor esforço, com o mesmo retry/backoff de toda
  chamada, via `PluggyClient.deleteItem`) e só marca `PluggyItemStatus.
DISCONNECTED` localmente **depois** da revogação ter dado certo; se o
  Pluggy falhar, o item continua com o status antigo (nunca marca
  desconectado por engano). Idempotente: item já desconectado devolve o
  estado atual sem chamar o Pluggy de novo. `Account` ganhou
  `disconnected: boolean` (do `PluggyItemStatus` por trás, igual o
  `lastSyncAt` de 8.6) — histórico nunca é apagado, só para de sincronizar.
  `manualSync`/`checkStatus` agora rejeitam (`422 BANK_ITEM_DISCONNECTED`)
  item desconectado, pra não devolver um "Pluggy indisponível" enganoso pra
  um estado que é permanente e local.
  **Gap consciente**: 08-seguranca § 4 pede reautenticação (senha, 5 min)
  pra conectar/desconectar banco (HU 1.7, Sprint 8, ainda não construída) —
  mesma lacuna que já existia em `connect()` desde a Sprint 6; registrado
  aqui pra não esquecer quando 1.7 for construída.
  Verificado ao vivo contra Postgres real: item fake que não existe no
  Pluggy de verdade devolveu `502 PLUGGY_UNAVAILABLE` e **não** marcou
  desconectado (status ficou intacto); marcado desconectado manualmente,
  `GET /accounts` veio com `disconnected: true`, `manualSync`/`checkStatus`
  rejeitaram com `422`, `DELETE` de novo foi idempotente (200, mesmo
  status), e isolamento confirmado com um segundo usuário (404 no item
  alheio, lista de contas vazia).
- **Code review de 8.5 (2026-09-23)**: 2 achados, os dois corrigidos e
  reverificados ao vivo. (1) `disconnect()` não tinha caminho de volta se a
  revogação no Pluggy desse certo mas a escrita local falhasse logo depois
  (queda de conexão, etc.): o item ficava com Pluggy já revogado mas status
  local antigo, e toda tentativa seguinte batia um 404 no Pluggy (item que
  já não existe lá) que virava `502` pra sempre, sem nunca conseguir marcar
  `DISCONNECTED`. Corrigido tratando 404 como sucesso em
  `PluggyClient.deleteItem` (`fetchWithRetry` ganhou um parâmetro
  `treatAsSuccess`) — item que já não existe lá **é** o resultado desejado,
  então a próxima tentativa se autocorrige em vez de travar. Reverificado ao
  vivo com um `pluggyItemId` real (UUID v4) que nunca existiu: confirmei
  primeiro com curl direto no Pluggy que a API devolve `404 ITEM_NOT_FOUND`
  pra esse caso (não `400`, que é o que um UUID mal formado dá), e só então
  chamei `DELETE /banking/items/:id` — marcou `DISCONNECTED` de primeira, em
  vez do `502` de antes da correção. (2) Faltava teste unitário travando a
  garantia "falha na revogação nunca chama a escrita local" (só tinha sido
  provada ao vivo) — adicionado em `banking.service.spec.ts`.
- **8.4 concluída (2026-09-23), versão simples (sem job nem e-mail, a pedido
  do usuário)**: aviso de reconectar 30/7 dias e reconectar em si.
  - **`reconnectWarningDays`**: 7 | 30 | null, calculado na hora a partir de
    `consentExpiresAt` (sem job, sem estado — mesmo espírito do
    `disconnected` de 8.5). Já vencido continua no limiar mais urgente (7),
    nunca vira null: sem sync não dá pra saber que venceu de verdade.
  - **Reconectar**: o plano original era `PATCH` no mesmo Item (é o que
    07-integracao-bancaria assumia). **Testado ao vivo direto contra a API
    do Pluggy, não funciona**: o conector Meu Pluggy devolve
    `400 "MeuPluggy item cant be updated"`. Corrigido o desenho: reconectar
    agora cria um Item novo (igual `connect()`) e revoga o antigo (melhor
    esforço, reaproveitando o `deleteItem`/8.5, inclusive o auto-recuperação
    de 404). `PATCH /banking/items/:id/reconnect` devolve um **id novo** —
    o front precisa trocar de id pro próximo `checkStatus`.
  - **Bug real achado testando isso ao vivo** (não existia antes desta
    etapa): `AccountRepository.upsertFromSync` nunca atualizava
    `pluggyItemId` numa conta já existente — só valia na criação. Sem
    reconectar isso nunca aparecia (cada conta só via 1 Item na vida toda);
    com reconectar, a conta ficava presa apontando pro Item antigo revogado,
    e `disconnected`/`lastSyncAt` (8.5/8.6) mentiam mesmo com o Item novo em
    dia. Corrigido incluindo `pluggyItemId` no `update` do upsert também.
  - **Verificado ao vivo com 2 autorizações reais do Nubank** (2 Items pro
    mesmo banco, sem desconectar o primeiro entre eles): a mesma conta
    (`externalAccountId` do Pluggy é estável entre Items) nunca duplicou —
    2 contas, 1674 transações, nada dobrado. Depois, `manualSync` no Item
    mais novo confirmou o `pluggyItemId` repontando certo, e desconectar o
    Item antigo não afetou mais a conta (`disconnected: false`, porque ela
    já apontava pro Item novo). `reconnectWarningDays` também testado ao
    vivo com os 3 casos (30, 7, sem data).
  - **Gap consciente (a pedido do usuário)**: sem job diário nem e-mail —
    o aviso só existe quando alguém chama a API (não dispara notificação
    sozinho). Fica pra quando decidirmos provedor de e-mail e agendamento.
  - **Gap consciente (fora do escopo desta etapa)**: a detecção "item que
    tinha movimento e virou vazio de repente = precisa reconectar" (a outra
    metade da regra de 03-regras-negocio § Consentimento) não foi
    construída — hoje só os status que o próprio Pluggy manda
    (`LOGIN_ERROR`/`OUTDATED`/`ERROR`) sinalizam problema.
- **2.3 concluída (2026-09-23) — Sprint 6 fechada**: cartão adicional/virtual
  → pessoa. Model `CardHolderHint` novo (RLS + `@@unique([accountId,
cardLast4])` — o mesmo final pode existir em contas diferentes, nunca é só
  por `userId`). Entra no pipeline de atribuição de pessoa (03-regras-negocio
  § Atribuição de pessoa) **antes** da `Rule` por estabelecimento e do padrão
  self, só depois de "já confirmada pelo User" (que já está garantido: o
  upsert do sync só atribui pessoa na criação, nunca no update). Criado do
  mesmo jeito que a `Rule` já funciona — sem tela própria ainda: `PATCH
/transactions/:id/person` ganhou `alwaysForCard` (paralelo ao
  `alwaysForMerchant`; os dois podem vir juntos), rejeita
  (`400 CARD_REQUIRED_FOR_HINT`) se a transação não tiver `cardLast4`.
  Verificado ao vivo contra Postgres/API real: hint criado e persistido
  certo, rejeição sem cartão identificado, isolamento entre 2 usuários (404
  na transação alheia).
  **Lição desta etapa**: mudar `packages/shared` no meio da sessão e testar
  ao vivo contra a API rodando (`pnpm --filter api dev`, `nest --watch`) não
  basta salvar o arquivo — o watch só cobre `apps/api/src`, não o pacote
  `shared` linkado. Precisa `pnpm --filter shared build` e reiniciar o
  processo da API à mão, senão o schema Zod antigo continua valendo e a
  API rejeita o campo novo como "Unrecognized key".
- **Sprint 6 fechada.**
- **Front iniciado (2026-09-23) — primeira tela de verdade: login (1.2)**. Até
  aqui só backend, a pedido do usuário ("puxar dado de verdade é melhor
  teste"); o DoD original (`docs/scrum/SPRINTS.md`) previa tela por sprint, e
  agora começamos a repor isso, começando pela raiz de dependência (nenhuma
  tela funciona sem sessão).
  - `app/(public)/login` (form com `react-hook-form` sem resolver — validação
    é sempre da API) e `app/(app)` (início provisório, só prova que a sessão
    funciona: e-mail + sair). Componentes novos reaproveitáveis: `Input`
    (erro de campo = texto exato da API, ícone + borda 2px danger) e
    `InlineAlert` (erro de regra, ex. credenciais inválidas) — ambos com
    teste de componente Cypress, seguindo o padrão de `Button`/`MoneyText`.
    `middleware.ts` ganhou proteção de rota (ausência do cookie manda pro
    login).
  - **2 bugs achados só testando num Chrome de verdade** (não pega em
    typecheck/lint/teste): (1) cookie de sessão velho (de um teste anterior
    nesta mesma sessão do Chrome, já revogado no servidor) fazia a home
    mostrar "Olá, undefined" em vez de mandar pro login — corrigido tratando
    o erro 401 de `/auth/me` explicitamente (antes só tratava sucesso/
    carregando). (2) a correção acima expôs um loop `/ → /login → /`: o
    middleware original mandava de volta pra `/` só por ver o cookie
    presente (nunca validava), então a home mandava pro login por 401 e o
    middleware mandava de volta na hora. Corrigido tirando essa decisão do
    middleware (que só pode ver "existe cookie", nunca "é válido") — quem
    decide "já estou logado, não preciso ver o login" é a própria página,
    depois de confirmar com `/auth/me` de verdade.
  - Verificado ao vivo: e-mail/senha errados (mensagem exata da API no
    `InlineAlert`), e-mail mal formado (erro de campo com foco automático),
    login certo (redireciona, mostra o e-mail), logout (limpa cookie,
    `/` depois disso manda pro login), e mobile (390×844, sem quebrar).
  - `react-hook-form` novo em `apps/web` (só pacote, sem resolver — a spec
    04-padroes-codigo já previa isso, só não estava instalado ainda).
- **Front: tela de Contas (2026-09-23)** — `app/(app)/accounts`: lista +
  criar (nome + tipo; campos só de cartão — fechamento/vencimento/limite —
  ficam pra uma próxima etapa, não bloqueiam ter a conta). Componente `Badge`
  novo (pílula, mapeado no design system), com teste Cypress. `format-
account-type.ts` traduz o enum pro rótulo em português.
  **Lição de ambiente (não é bug do app)**: rodar `pnpm build` (build de
  produção) com o `next dev` no ar ao mesmo tempo corrompe o `.next`
  compartilhado pelos dois — a próxima página pedida pelo dev server vira
  `503`/`ENOENT` num chunk que o build de produção sobrescreveu. Sintoma:
  página sem estilo nenhum e a query nunca resolve ("Carregando…" preso,
  já que o JS do React nunca terminou de carregar pra hidratar). Correção:
  nunca rodar os dois ao mesmo tempo contra o mesmo `.next`; se acontecer,
  `rm -rf apps/web/.next` e reiniciar o `next dev`.
  Verificado ao vivo: criar 2 contas (cartão e carteira), lista atualiza sem
  reload, nome vazio rejeitado com a mensagem exata da API, sobrevive a um
  reload completo da página.
- **Code review do front (2026-09-23)** — login + home + Contas: 1 achado,
  corrigido e reverificado ao vivo. `use-accounts-page.ts`: "Cancelar" não
  travava enquanto a request de criar conta estava no ar (rede lenta é
  comum, mobile-first); cancelar nesse meio tempo limpava `ruleError` na
  hora, mas a resposta (que só chegava depois) escrevia um erro nesse mesmo
  estado — e como reabrir o formulário nunca limpava `ruleError`, a próxima
  vez que o usuário abria "Nova conta" via um erro de uma tentativa que já
  tinha cancelado. Corrigido com um contador de submissão: cancelar
  incrementa, e a resposta (sucesso ou erro) só atualiza o estado se ainda
  for a submissão atual. Reproduzido de propósito interceptando o `fetch`
  no Chrome pra forçar uma resposta de erro com 3s de atraso, cancelando
  antes dela chegar, e confirmando que o formulário reaberto vinha limpo
  (sem a correção, o alerta forçado reaparecia).
  Também investiguei e descartei uma hipótese mais séria (cache do
  TanStack Query servindo `/auth/me` velho logo após logout e fazendo o
  `/login` ricochetear pra home) — testado ao vivo com screenshots quadro a
  quadro, não reproduz.
- **Front: tela de Pessoas (2026-09-23)** — `app/(app)/settings/people`:
  lista + criar + arquivar. Mesmo desenho de Contas (submissão numerada
  contra a corrida do cancelar). Self ("Eu") vem com badge e sem "Arquivar"
  (a API rejeita arquivar o self, `403 CANNOT_ARCHIVE_SELF` — o front só
  esconde a ação em vez de deixar o usuário bater nesse erro à toa).
  Verificado ao vivo: criar, arquivar (some da lista), self protegido.
- **Front: tela de Categorias (2026-09-23)** — `app/(app)/settings/categories`:
  lista + criar + renomear + arquivar. Um form só serve criar e renomear
  (`editing` diferencia os dois); mesma submissão numerada contra a corrida
  do cancelar. Sprint 2 do front (Contas/Pessoas/Categorias) está completa.
  Verificado ao vivo: renomear "Lazer" → "Lazer e hobbies" (campo já vem
  preenchido), arquivar "Outros" (some da lista), as 13 categorias do seed
  aparecendo certas.
- **3.3 concluída (2026-09-23) — Sprint 2 fechada de verdade**: `POST
/transactions` lança à mão. Só conta `MANUAL`/`IMPORT` (`422
MANUAL_ENTRY_NOT_ALLOWED` numa conta `PLUGGY` — ela só é escrita pelo
  sync). Categoria/pessoa só em `CREDIT_CARD` (`400
CATEGORY_PERSON_ONLY_ON_CARD` fora disso, igual o sync já filtra); sem
  pessoa informada num cartão, cai no padrão "Meu" (mesmo self do sync). A
  mesma linha aparece em `/transactions` (cartão) ou `/movements` (resto)
  pelo tipo da conta, sem endpoint separado — como tudo mais nessa tabela.
  Aproveitei pra mover `dayFromDateString` de `banking.mapper.ts` pra
  `common/date/timezone.ts` (não é coisa de Pluggy, é semântica de data do
  produto) — reaproveitado aqui pra aceitar data pura de um futuro `<input
type="date">`.
  Verificado ao vivo: lançamento em cartão (personId default = self),
  lançamento em carteira (sem categoria/pessoa), rejeição de pessoa numa
  conta não-cartão, rejeição numa conta Pluggy, separação certa entre
  `/transactions` e `/movements`, isolamento entre 2 usuários (404 na conta
  alheia).
- **Code review (2026-09-23)** — pessoas/categorias/lançamento manual: 2
  achados, os dois corrigidos e reverificados ao vivo. (1) Em Categorias, a
  lista de "Renomear"/"Arquivar" continua clicável com o formulário aberto
  (não são exclusivos na tela) — se um erro de regra aparecia numa tentativa
  (ex.: nome duplicado) e o usuário clicava "Renomear" numa outra categoria
  em vez de cancelar, o formulário trocava de contexto certinho mas o alerta
  antigo ficava colado, parecendo erro da ação nova. Corrigido limpando
  `ruleError` (e invalidando a submissão em andamento) em `openCreateForm`/
  `openEditForm`, não só no `closeForm`. (2) `occurredAt` do lançamento
  manual só validava o formato `AAAA-MM-DD`, nunca se a data existia de
  verdade — `"2026-02-30"` virava silenciosamente 2 de março (sem erro
  nenhum) e `"2026-13-01"` virava `Invalid Date`, que só quebrava na hora de
  gravar no Postgres (`500` genérico em vez do `400` que o schema prometia).
  Corrigido com uma validação de calendário de verdade (`Date.UTC` +
  round-trip). Reverificado ao vivo: as duas datas inválidas agora voltam
  `400 "Informe uma data válida."`, data válida continua funcionando, e o
  fluxo de renomear/criar categoria não vaza mais erro entre contextos.
- **Front: tela de lista de transações do cartão (2026-09-23)** —
  `app/(app)/transactions`: lista as transações do mês (`GET /transactions`),
  cruzando `categoryId`/`personId` com as listas de categorias/pessoas pra
  mostrar nome (a API não embute a relação). Cada linha mostra
  descrição/`merchant`, data (`formatShortDate`, `America/Manaus`), badge de
  categoria (`Sem categoria` quando não tem), badge de pessoa quando não é o
  próprio usuário, e valor (`MoneyText`, estorno inverte o sinal). Escolhida
  como próxima etapa por decisão própria ("decida por mim"): é o "coração do
  produto" do spec, e é exatamente o que o lançamento manual (3.3) foi
  construído pra destravar — testável com dado de verdade sem precisar do
  Pluggy. Link "Cartão" adicionado na Home. Verificado ao vivo: usuário de
  teste com 2 lançamentos manuais (um categorizado "Mercado", um sem
  categoria) — as duas linhas renderizaram certinho, com data, badges e
  valores corretos.
- **Front: corrigir categoria e pessoa na lista de transações (2026-09-23)**
  — clicar numa transação abre um painel embaixo dela (mesmo padrão de
  formulário único de `use-categories-page.ts`: um alvo por vez, submissão
  numerada contra a corrida do cancelar) com botões de categoria e de pessoa
  (`PATCH /transactions/:id/category`, `PATCH .../person`) e um checkbox
  "sempre que for [estabelecimento]" (só aparece quando a transação tem
  `merchant`) que grava a `Rule` junto. Escolhido como continuação natural da
  lista, já que os dois endpoints (Sprint 3) já existiam no backend. Divisão
  entre pessoas (`split`) ainda não tem UI — fica pra próxima etapa. Verificado
  ao vivo: cliquei em "Cinema" (sem categoria), selecionei "Lazer", o painel
  fechou e o badge atualizou na lista; conferido no Postgres que
  `categoryId` gravou de verdade.
- **Alinhamento com o protótipo (2026-09-22, o de verdade: `docs/specs/06`)
  (2026-09-23)** — usuário apontou que o front não estava batendo com o
  desenho. Reconstruí a tela de transações como **Fatura de verdade**
  (`08-fatura.dc.html`): hero escuro com "Meu nesta fatura" em lima gigante,
  barra de progresso, tabela `Fatura do banco − Não é meu = Meu` (usa
  `GET /invoice`, Sprint 4, que não tinha UI ainda), filtro em pílula
  Todas/Meu/Não é meu, lista agrupada por dia (Hoje/Ontem/data), chip de
  pessoa com avatar colorido (self sempre lima) em vez do `Badge` genérico.
  Também: `BottomNav` flutuante fiel ao protótipo (pílula com margem de 16px,
  só o item ativo mostra rótulo dentro de uma pílula lima, os demais só
  ícone) — Início/Classificar (aponta pra `/transactions`, que já faz a
  correção de categoria/pessoa)/Orçamento/Relatórios (os 2 últimos
  desabilitados, sem tela ainda); e `IconButton` circular (44px, fundo
  surface) no lugar do link de texto "← Início" em todas as telas, batendo
  com o `.ib` do protótipo. **Gap consciente**: a Home continua provisória
  (não é `07-inicio` — falta o dashboard de orçamento/ritmo, Sprint 5 no
  front); o protótipo também tem uma **versão desktop** completa (`d0X-*`,
  layout em grid, nav no topo) prevista em `docs/specs/05-componentizacao.md`
  ("um único código, shell muda") — ainda não construída, decidir com o
  usuário quando entrar. Verificado ao vivo: fatura com 3 lançamentos em 2
  dias, filtro "Não é meu" isolando só a transação da Juliana, categorizar
  "Cinema" via painel funcionando, botão de voltar circular igual ao
  protótipo.
- **Front: tela de login 100% fiel ao protótipo (2026-09-23)** — reconstruída
  a partir de `01-login.dc.html`: título vira o headline grande "Da fatura,
  só o que é seu." (em vez do genérico "Entrar"), campo de senha ganhou
  botão de mostrar/ocultar (`Input` ganhou prop `trailingAction`, reutilizável
  em qualquer campo), texto de rodapé "O acesso é só por convite." fixo
  embaixo. **Gap consciente**: o protótipo tem link "Esqueci minha senha" —
  não incluí porque `POST /auth/forgot-password` (spec 08-seguranca) ainda
  não existe; um link morto seria pior que a ausência. Verificado ao vivo:
  toggle de senha funcionando, login de ponta a ponta com o novo layout.
- **Backend: HU 7.4 Ritmo (2026-09-23)**, pré-requisito pra Home 100% fiel
  (`07-inicio` mostra "no ritmo"/"sobram"/"por dia", que são dinheiro — não
  dá pra inventar isso no frontend). `GET /budget/pace?month=`: junta o teto
  variável (`BudgetMonth`) com o "Meu" do mês (`InvoiceService.getSummary`,
  mesmo número que já alimenta a fatura) e calcula, em `pace.mapper.ts`
  (função pura, testada isolada): dias do mês já completos vs. restantes,
  gasto esperado linear até agora, `ON_TRACK`/`OVER_PACE`, quanto sobra por
  dia até o fim do mês. Verificado ao vivo: sem orçamento configurado tudo
  zero; configurando renda/fixos/poupança, os números batem à mão (22/30
  dias, esperado R$ 1.833,33, R$ 312,50/dia restante).
- **Front: Home 100% fiel ao protótipo (2026-09-23)** — `07-inicio`
  reconstruída: segmentado "Cartão/Extrato" (só Cartão tem tela, Extrato
  inerte até 5.2 ter UI), hero de ritmo (`GET /budget/pace`) com badge
  "No ritmo"/"Fora do ritmo", número grande, barra com marcador "ritmo de
  hoje" na posição `daysElapsed/daysInMonth`, "R$X abaixo/acima do ritmo",
  teto, "Sobram" e "Por dia, até [data]". "Faturas de [mês]": uma linha por
  cartão (`CardInvoiceRow`, um `useInvoice` por conta — não dá pra chamar
  hook em loop), com barra mine/total e "vence dia N". **Bug achado e
  corrigido nessa etapa**: o modificador de opacidade do Tailwind
  (`bg-x/15`) não resolve quando a cor é uma CSS custom property — virava
  transparente de verdade (track da barra e divisores sumiam, só sobrava o
  preenchimento e o marcador soltos). Corrigido trocando por tokens
  semânticos de verdade (`on-inverse-muted`, `on-inverse-hairline`,
  `accent-tint-on-inverse` em `theme.css`) em vez de opacidade improvisada —
  mesma correção aplicada retroativamente na Fatura, que tinha o mesmo bug.
  **Gap consciente**: o nudge "N compras sem dono" do protótipo não entrou —
  nosso modelo sempre atribui `personId` = self por padrão (não existe
  "sem dono" de verdade nos dados; o mais próximo seria "sem categoria",
  que já é resolvível na Fatura). Verificado ao vivo, incluindo comparação
  pixel a pixel com a imagem do hero que o usuário mandou.
- **Front: shell de desktop (2026-09-23)** — `05-componentizacao.md`: "um
  único código, muda só o shell". `TopNav` (barra fixa no topo, `md:flex`)
  substitui a `BottomNav` (`md:hidden`) a partir do breakpoint `md`; mesmos
  4 destinos (Início/Classificar/Orçamento/Relatórios), sempre com rótulo
  visível (tem espaço de sobra). **Gap consciente**: isso é só a troca de
  shell, não o redesenho por tela — o protótipo tem telas desktop
  (`d0X-*.dc.html`) com grid de 2 colunas e conteúdo bem mais largo que os
  420px do celular; cada tela continua centralizada e estreita mesmo em
  telas grandes. Redesenhar isso é escopo bem maior, fica pra decidir
  depois se vale a pena. Verificado ao vivo: 1440px mostra `TopNav` (sem
  `BottomNav`), 390px volta pra `BottomNav` flutuante (sem `TopNav`), nunca
  as duas juntas.
- **Front: fluxo de conectar cartão (2026-09-23)** — usuário reparou que a
  Home sem nenhum cartão não tinha a tela de onboarding do protótipo
  (`03-inicio-vazio` → `04-escolher-banco` → `05-lendo` → `06-pessoas`).
  Construído: Home sem cartão mostra o convite (`ConnectBankCard`, hero +
  os 3 itens "app só lê"/"senha fica com o banco"/"Pix e débito no
  Extrato"); "Conectar pelo banco" chama `POST /banking/items` e abre o
  `authorizeUrl` **numa aba nova de verdade** — a lista de bancos e o login
  são a tela hospedada do próprio Pluggy, nunca dentro do nosso app (por
  isso a etapa "Conectar cartão" do protótipo não precisou de tela nossa).
  Nossa aba vai pra `/connect-bank/[id]`, que faz o polling de
  `GET /banking/items/:id` (sem webhook, mesmo padrão de `checkStatus`) e
  mostra "Aguardando você autorizar.../Lendo suas compras…"; ao sincronizar
  (`status=UPDATED`), invalida `accounts`/`transactions`/`budget-pace` e
  entra numa etapa leve "Quem mais usa seus cartões?" (reaproveita os hooks
  de pessoa já existentes: criar, arquivar). **Gap consciente**: o
  protótipo mostra contagem ao vivo de compras lidas ("143 compras
  encontradas") — nosso backend sincroniza tudo de uma vez numa chamada só
  (sem progresso incremental do Pluggy), então a tela mostra um estado de
  espera indeterminado, nunca um número inventado. Verificado ao vivo: o
  clique em "Conectar pelo banco" abriu de verdade o OAuth do Pluggy numa
  aba nova; sem completar a autorização real (não interajo com login de
  banco), simulei a resposta `UPDATED` só no `fetch` do browser pra
  confirmar a transição pra "Quem mais usa seus cartões" — criei "Mãe" de
  verdade ali (API real), "Continuar" voltou pra Home, que corretamente
  continuou "sem cartão" (nada foi sincronizado de verdade, como devia).
- **Ritmo repensado com dado bancário real (2026-09-23)** — usuário conectou
  um Nubank de verdade e reparou que "Meu em setembro" (R$339,34) não batia
  com a fatura real do banco (R$589,89). Investigando ao vivo (query direta
  no Postgres com `set_config('app.user_id', ...)`, mesmo truque de sempre
  pra RLS), achei a causa: a fatura estava sendo calculada por **mês
  calendário** (`occurredAt`), mas o spec já dizia que deveria agrupar por
  `billId` de verdade — "as pendentes (sem billId) pertencem à fatura
  aberta" (03-regras-negocio). Bug meu, não do usuário. Corrigido:
  - `InvoiceService`: conta `PLUGGY` usa `billId IS NULL` (fatura aberta de
    verdade); conta `MANUAL`/`IMPORT` (sem banco por trás, `billId` sempre
    null) continua no mês calendário, única aproximação possível.
    `getSummary` agora soma a fatura aberta de cada cartão (não mais um
    único `month`).
  - **Gastos fixos** (novo): model `FixedExpense` (nome + valor, RLS,
    arquivar), `GET/POST/PATCH /fixed-expenses`, tela
    `/settings/fixed-expenses` — lista + criar + remover.
  - **Ritmo redesenhado**: Teto = renda informada direto (não mais a
    fórmula renda+benefício−fixos−poupança — o usuário quer os dois
    conceitos separados). Gasto = fatura aberta somada em todos os
    cartões + gastos fixos ativos. Removido o campo "Por dia, até..." do
    hero (a pedido do usuário); "Sobram" ficou sozinho, largura cheia.
  - **Tela de Renda** (nova, `/settings/income`) — faltava completamente
    (só dava pra configurar via API); agora edita renda mensal e renda de
    benefícios (a segunda ainda digitada à mão).
  - `Input` ganhou `trailingAction` reaproveitado; `parseMoneyInput` novo
    em `format-money.ts` (converte "1.200,50" digitado pra centavos, só
    formato, nunca validação — quem valida é a API).
    **Gap fechado (Fase 4, ver entrada de 2026-09-23 mais abaixo)**: "renda
    de benefícios" agora vem do saldo real de uma conta InfinitePay/CHECKING
    via Pluggy quando o usuário marca essa conta na tela de contas; sem
    conta marcada, continua manual. Verificado ao vivo contra o Nubank real
    do usuário: teto e gasto corretos após configurar renda, criar/remover
    gasto fixo refletindo no hero na hora.
- **Pagamento antecipado abate a fatura aberta (2026-09-23)** — usuário
  reparou que o valor (R$3.695,77) continuava longe do real (R$589,89) e
  explicou: já tinha adiantado pagamentos. Achado: `CARD_PAYMENT` era
  **totalmente excluído** do cálculo (certo pra "gasto", errado pra
  "quanto falta pagar"). Corrigido: `findOpenRows` agora também traz
  `CARD_PAYMENT` da fatura aberta, e `computeInvoice` abate do total e do
  "meu" juntos (nunca do "não é meu" — pagar o próprio cartão não reduz a
  fatia de terceiros). R$3.695,77 → **R$1.233,78** depois de descontar
  R$2.461,99 em pagamentos antecipados reais.
  **Explorado e revertido**: cogitei usar `/bills` da Pluggy como fonte do
  total (o número "de verdade" do banco) — testei ao vivo contra a conta
  real e descobri que esse endpoint só devolve **fatura já fechada**
  (a mais recente tinha vencimento no passado); a fatura aberta de
  verdade nunca aparece lá enquanto não fecha. Não dava pra usar.
  **Gap consciente, sem solução ainda**: mesmo com o desconto de
  pagamento, R$1.233,78 ainda não bate exato com os R$589,89 que o
  usuário vê no app do Nubank — não consegui fechar essa última
  diferença sem inspecionar a fatura em tempo real dentro do banco.
  Registrado aqui pra retomar se o usuário quiser investigar mais a
  fundo (possível causa: mais de um pagamento cobrindo a mesma fatura,
  ou billId ainda não atribuído a transações que já deveriam ter fechado
  num ciclo anterior).
- **Investigação a fundo com OFX real (2026-09-23), sem solução ainda** —
  usuário baixou o OFX oficial do Nubank pra conferir. O `LEDGERBAL` do
  arquivo bate exato com o que ele via no app (R$589,88) e revelou a
  matemática certa do banco:
  `saldo devedor = última fatura FECHADA + (compras novas − pagamentos) desde o fechamento dela`
  (conferido linha a linha: R$1.840,80 + R$1.211,07 − R$2.461,99 =
  R$589,88 ✓). Tentei implementar isso (`/bills` da Pluggy pro saldo
  anterior + filtro por `occurredAt >= dueDate − 7 dias` pra pegar só a
  movimentação do ciclo aberto) e **deu número negativo** — achei outro
  problema real: o `billId` que esse conector atribui é inconsistente,
  tem transação de setembro (depois do fechamento) presa a uma fatura de
  agosto já fechada, então filtrar por data sozinho conta coisa que já
  está no saldo anterior (dupliquei valor). **Reverti pro que já estava
  bom** (R$1.233,78, commit anterior: fatura aberta por `billId IS NULL`
  - `CARD_PAYMENT` abatendo) em vez de arriscar piorar.
    **Pra quem quiser retomar**: os dados reais de conferência ficam aqui
    — bill fechada mais recente (`/bills`, id `b4113538-9c59-4c44-9262-
679ffc7da8e5`, vencimento 2026-09-03, total R$1.840,80); OFX cobre
  2026-08-27 a 2026-09-26; 27 transações reais nesse período (18 compras
  somando R$1.211,07, 4 pagamentos somando R$2.461,99). O caminho certo
    provavelmente exige um sinal mais confiável de "isso já está na fatura
    fechada X" do que `billId` sozinho — talvez cruzar por data **e**
    `billId` (só ignorar `billId` de transação claramente fora da janela
    esperada), ou aceitar a imprecisão de ±alguns dias como escopo do MVP.
- **Fatura fechada com precisão de centavos (2026-09-23)** — retomei a
  investigação acima depois que o usuário notou o problema certo: compra
  parcelada estava entrando **inteira** (todas as parcelas futuras) na
  fatura aberta, não só a parcela que vence agora. Medido: R$3.317,09
  contados quando só R$817,39 (a próxima parcela de cada compra) devia
  entrar — R$2.499,70 de excesso. Os dois bugs (parcela futura +
  `billId` excluindo saldo anterior) se cancelavam parcialmente, por
  isso R$1.233,78 "parecia" razoável. Corrigido os dois juntos dessa
  vez: `keepNextDueInstallmentOnly` (agrupa parcelas da mesma compra
  pelo nome sem o sufixo "N/M" + data + total de parcelas, mantém só a
  de menor número) + `computeInvoiceWithCarryover` (soma o saldo da
  última fatura fechada, `/bills` da Pluggy, com a movimentação ainda
  sem `billId` — sem o filtro por data que causou a regressão anterior,
  só `billId IS NULL` mesmo, que não deu negativo dessa vez). Resultado
  ao vivo: **R$574,88** (era R$1.233,78), contra R$589,88 reais — os
  R$15,00 que sobram são uma compra do usuário (a mais recente dele)
  que a API de transações da Pluggy ainda não sincronizou (confirmado:
  refiz o sync manual e ela continuou ausente — atraso do lado da
  Pluggy, não bug nosso). Considero essa etapa fechada.
- **Fase 4 (saldo InfinitePay/benefício) implementada.** `Account` ganhou
  `balanceCents` (só populado em CHECKING pelo sync do Pluggy — CREDIT_CARD
  nunca leva saldo, a fatura é calculada à parte) e `isBenefitAccount` (flag
  manual, marcada na tela de contas; só uma conta por vez, sempre CHECKING —
  `AccountService.setBenefitAccount` desmarca a anterior e rejeita cartão
  com 422). Decisão de produto (perguntada ao usuário, não inferida):
  quando existe conta marcada, "Renda de benefícios" em `/settings/income`
  vira só leitura e usa o saldo sincronizado automaticamente em vez do
  valor digitado à mão; sem conta marcada, continua manual como antes.
  Verificado ao vivo contra o Nubank real do usuário: sync popula
  `balanceCents`, o toggle na tela de contas reflete na tela de renda,
  desmarcar volta a ser editável. Deixei a conta do usuário desmarcada ao
  final (era só teste — ele marca se quiser usar de verdade).
- **Fase 4, code review + gaps achados testando ao vivo.** `/code-review`
  achou 3 problemas reais, todos corrigidos: (1) marcar/desmarcar conta de
  benefício em duas chamadas separadas tinha janela de corrida — agora é um
  `$transaction` só (`AccountRepository.setBenefitAccount`, mesmo padrão do
  `SplitRepository`); (2) sync do Pluggy sobrescrevia `balanceCents` com
  `null` quando o Pluggy omitia o saldo por um sync (transiente) — agora só
  atualiza o campo quando o valor realmente veio; (3) reset do formulário de
  renda podia descartar edição não salva se o saldo da conta de benefício
  mudasse em segundo plano — guardado com `isDirty` num ref.
  Testando ao vivo, o usuário achou um gap real: **conectar banco só
  existia na Home, e só enquanto não houvesse nenhum cartão ainda**
  (`ConnectBankCard` some depois do primeiro) — sem jeito de conectar um
  segundo banco (o caso real: InfinitePay, depois do Nubank). Corrigido:
  tela de Contas ganhou botão "Conectar banco" (sempre visível) e "Remover"
  (arquiva, mesmo padrão do `FixedExpenseService.archive`, `PATCH
/accounts/:id/archive`). O botão de marcar conta de benefício também
  virou ícone (carteira, deliberadamente diferente de estrela/coração de
  favorito) — texto longo tipo "Marcar como benefício" espremia o badge ao
  lado quando o nome da conta era grande (ex. "Nu Pagamentos S.A. -
  Instituição de Pagamento"); nome da conta também ganhou truncamento.
  Verificado ao vivo: usuário conectou o InfinitePay de verdade via Pluggy,
  marcou como benefício, saldo real (R$31,10) apareceu certo em
  `/settings/income`.
  Pedido extra do usuário: mostrar esse saldo também na Início, como um
  segundo card arrastável ao lado do card de ritmo (carrossel via scroll
  nativo com snap, sem lib de drag — `HeroCarousel`, `PaceHeroCard`,
  `BenefitBalanceCard`). Sem data de validade no card (perguntei — o
  Pluggy não manda isso pra conta corrente, e o app nunca inventa número);
  mostra a hora do último sync em vez disso. Os dois cards têm a mesma
  altura porque o card de benefício usa `h-full` dentro do item do
  carrossel (que já estica pra bater com o mais alto, o de ritmo) — não um
  `min-height` chutado.
- **Nav reorganizada, a pedido do usuário.** "Configurar" (Contas, Pessoas,
  Categorias, Gastos fixos, Renda) saiu do rodapé solto da Início e virou
  a engrenagem na nav (`SettingsMenu`), abrindo um bottom sheet — mesmo
  padrão do protótipo usado em "Conectar cartão" (`04-escolher-banco`: véu
  escuro + folha com puxador subindo da base), não um popover de canto (a
  primeira tentativa, rejeitada: "ficou ruim, siga o padrão do design").
  "Orçamento" (ícone de alvo) saiu da nav — nunca teve tela própria.
  Segundo item virou "Fatura" (era "Classificar"), ícone de recibo. Sair
  também mudou de lugar: era e-mail + botão soltos no fim da Início, agora
  é a última linha do mesmo bottom sheet — Início não mostra mais e-mail
  nem tem botão de sair. Ícones da nav trocados de SVG desenhado à mão
  para `lucide-react` (a pedido do usuário: "use lib pra esses ícones").
  Token novo: `--color-scrim` (véu do bottom sheet) — mudança de
  `tailwind.config.ts` exigiu restart do dev server pra pegar (gotcha já
  conhecido, não é hot-reload).
- **Telas de "Configurar" alinhadas ao protótipo (mobile).** Pedido do
  usuário: seguir o padrão do protótipo nas 5 telas do menu Configurar,
  criando as que faltassem lá. Decisão (perguntada, não assumida): criar
  artboard novo dentro do canvas do Claude.ai é arriscado por fora do
  editor dele (só leitura/publicação genérica, sem o editor de verdade) —
  optou por seguir os protótipos que já existem (Contas = `20-contas`,
  Pessoas = `06-pessoas`) e aplicar os mesmos tokens/padrão de linha nas
  telas sem protótipo dedicado (Categorias, Gastos fixos; Renda já tinha
  campo `.fld` parecido, mantida). Mudança visual em comum: linha sem card
  (ícone circular + texto + divisória fina de 1px), ações por ícone
  (lápis/X) em vez de link de texto "Renomear"/"Remover"/"Arquivar".
  Contas ganhou seções "Conectadas pelo banco" / "Manuais" + status de
  sincronização inline ("Atualizado hoje às HH:mm", reusa `formatSyncedAt`
  da Fase 4). Pessoas: campo de adicionar sempre visível (sem alternar
  formulário), igual ao protótipo. Verificado ao vivo nas 4 telas.
- **Categorias virou lista fixa, sem CRUD.** A pedido do usuário: "vou usar
  esses mesmo padrão [do seed], só quero que add ícone pra cada um".
  Removido criar/renomear/arquivar categoria em todas as camadas (rota,
  service, repository, DTO, schema Zod, hooks de mutação do front) — só
  listar e atribuir numa transação continuam existindo. Tela virou só
  leitura, com ícone próprio por categoria (`categoryIcon`, 13 ícones da
  lista do seed + fallback genérico pra categoria fora dela).
- **Tela de Fatura (/transactions) alinhada ao protótipo (08-fatura).**
  Cabeçalho com ícone do banco + nome da conta + subtítulo, badge "Fatura
  aberta de [mês]" + "vence dia X", card escuro com o número grande, barra
  de progresso e a quebra "Fatura do banco / − Não é meu / = Meu" dentro
  de uma caixa clara; linhas do dia sem card, divisória fina. Sem a faixa
  "A classificar" do protótipo — decisão já tomada (ver acima, "Toda
  transação nasce Meu"), esse app não tem fila de classificação.
  `currentMonthKey()` novo em `format-month.ts`: mês "de agora" sempre em
  America/Manaus, nunca `toISOString().slice(0,7)` (erra perto da virada).
- **Detalhe da transação virou bottom sheet (12-detalhe).** Pedido do
  usuário: "tem que aparecer uma tela igual a do protótipo e não as
  opções em baixo" — trocado o acordeão inline (abria embaixo da linha)
  por uma folha (véu + puxador, mesmo padrão do menu Configurar): detalhe
  (data, cartão, parcela, quem gastou, categoria, aviso de parcelas
  restantes) + os dois seletores de 10-classificar-escolha, tudo na
  mesma folha — escolher nunca fecha, volta pro detalhe. "Concluído" no
  lugar do "Salvar" do protótipo: a escolha já salva na hora, não fica
  nada pendente pra salvar de verdade. `TransactionSheet` novo componente,
  `formatDateTimeLong` novo em `format-date.ts`.
- **Bandeira do banco, escolhida pelo usuário.** `Account` ganhou `bankLogo`
  (enum fechado: nubank/banco-do-brasil/picpay, nunca string livre) —
  marca manual, nunca heurística por nome do banco. Logos de
  `brand/bancos/` servidos em `apps/web/public/bancos/` (CSP `img-src
'self'`, nunca imagem do Pluggy). `BankAvatar` novo componente
  (DESIGN_SYSTEM § Logos de bancos: avatar redondo branco, logo a ~58%,
  PicPay 50%; monograma Fog quando não escolhido) usado em Contas (toca
  no avatar pra abrir o `BankLogoPicker`), cabeçalho da Fatura e linha de
  fatura da Início. `AccountService.setBenefitAccount` virou `update`
  (PATCH único pros dois campos editáveis, só mexe no que vier no body).
- **Dois bugs achados testando a fatura do "gold" ao vivo.** (1) Lista de
  lançamentos mostrava TODAS as parcelas de uma compra parcelada (1/3,
  2/3, 3/3 juntas), não só a da vez — mesmo bug já corrigido no cálculo
  da fatura (Fase 4), mas ali na lista, não: todas as parcelas
  compartilham a mesma `occurredAt` (data da compra), então caem no
  mesmo mês calendário juntas. `installmentGroupKey` extraído pra
  `common/installment-group.ts` (fonte única entre InvoiceRepository e
  TransactionRepository — já divergiu uma vez, ver histórico da Fase 4).
  (2) "Pagamento recebido" (CARD_PAYMENT) aparecia igual a uma compra
  normal na lista — sem sinal, "Sem categoria", avatar de pessoa, nada
  indicava que era pagamento de fatura. Agora vem com sinal negativo,
  "Pagamento da fatura" no lugar da categoria, sem avatar; no sheet de
  detalhe, "Quem gastou"/"Categoria" somem pra essa linha (atribuir isso
  a um pagamento não faz sentido). Cor do valor de pagamento também
  ajustada: `text-primary-ink` sozinho quase não se distinguia do preto
  em texto pequeno — virou chip com fundo `tint` (mesmo padrão dos
  badges de status), agora visivelmente verde.
- **Terceiro bug na mesma fatura, achado analisando o OFX real do
  Nubank do usuário direto**: Centauro (R$86,51) e Mercado Livre
  (R$358,33) não apareciam de jeito nenhum na lista — a parcela que
  vence agora foi comprada em agosto (a data da linha é a da compra,
  não a do vencimento), e a lista só olhava o mês calendário atual. Mês
  calendário sozinho nunca foi suficiente pra saber o que está na
  fatura aberta — `billId IS NULL` (Pluggy) é o sinal certo, mesmo
  critério que o `InvoiceService` já usava pro total. Corrigido com um
  `OR` na query (mês calendário OU parcela ainda sem billId de conta
  PLUGGY); afetava várias outras parcelas mais antigas também
  (Mastercel, Gocase, Playstation, Vivoeasyanual), todas voltaram a
  aparecer.
- **UI de dividir compra construída (2026-09-23)**: sheet de transação ganhou
  a view `split` (padrão do protótipo 11-dividir) — modo Igualmente/Por
  valor, grade de pessoas pra "quem entra", preview calculado pela API
  (nunca no cliente), soma validada antes de salvar. Usa os endpoints do
  backend (Sprint 3 Etapa 3) que já existiam. Junto, corrigido um bug de
  cache achado ao vivo: mudar pessoa/split de uma transação só atualizava o
  card de "Meu"/"Não é meu" depois de dar refresh manual — as mutações
  agora invalidam `invoice` e `budget-pace` além da lista de transações.
  Verificado ao vivo: R$17,45 dividido em R$8,73+R$8,72 entre duas pessoas,
  card da Fatura caiu de R$130,04 pra R$121,32 na hora, sem refresh.
- **Máscara de valor em todo input de dinheiro (2026-09-23)**: `MoneyInput`
  (novo componente) reformata o texto a cada tecla digitada (preenche da
  direita pra esquerda, como o padrão brasileiro de caixa). Aplicado em
  Renda, Gastos fixos e nos campos de valor da divisão de compra. Conferido
  também que todo input já usa 16px (`text-base` do Tailwind) — não tem
  zoom indesejado no iOS, nenhuma mudança necessária aí.
- **Logo do InfinitePay (2026-09-23)**: adicionado ao `bankLogoSchema` e à
  lista de opções do `BankLogoPicker`, com o SVG oficial em
  `apps/web/public/bancos/infinitepay.svg`. Verificado ao vivo: selecionado
  numa conta InfinitePay real, avatar atualizou na hora em Contas.
- **Auditoria de segurança (2026-09-23)**: rodado o checklist das 5
  categorias (isolamento por usuário, permissão no navegador, IDOR, chaves
  expostas, XSS) sobre `apps/api`/`apps/web`. Nenhum achado crítico/alto/
  médio. Duas observações de baixa severidade registradas (não corrigidas
  por não serem exploráveis hoje): `auth.repository.ts` `touchSession`/
  `revokeSession` sem `userId` no where (seguro porque só rodam depois do
  token já validado, mas sem teste que trave essa invariante); e
  `docker-compose.yml` com senha default fraca só de dev, protegida por
  `scripts/deploy-check.sh` mas não chamada automaticamente por
  `docker compose up`.
- **Bug real achado conectando o Banco do Brasil pela primeira vez
  (2026-09-23)**: pagamento de fatura do BB aparecia na lista como uma
  compra comum ("Sem categoria", sem chip verde) — o `resolveKind` só
  reconhecia pagamento pelo `categoryId` "05100000" do Nubank, mas o BB
  manda uma categoria diferente e não-exclusiva por canal de pagamento
  (Cash, Transferência interna, PIX). Corrigido usando
  `operationType === "PAGAMENTO_FATURA"` (visto na prática em ambos os
  bancos, e distinto do "PAGAMENTO" genérico de uma parcela comum) como
  sinal adicional. Verificado ao vivo: as 61 linhas "PGTO..." do BB
  viraram "Pagamento da fatura" com chip verde depois de um novo sync.
- **Bug achado no mesmo teste: transação dividida aparecia "Sem dono" na
  lista** — `personId` null é o mesmo sinal tanto pra "nunca atribuído"
  quanto pra "dividido entre pessoas" (`Split`), e a lista só tratava o
  primeiro caso. Agora mostra um chip "Dividido" quando a transação tem
  `splits`. Verificado ao vivo numa compra parcelada já dividida.
- **Os 2 achados de baixa severidade da auditoria de segurança corrigidos
  (2026-09-23)**: `touchSession`/`revokeSession` (`auth.repository.ts`) agora
  têm comentário explicando por que são seguros sem `userId` no where (só
  recebem id já validado — nunca vindo de param/body do cliente); e
  `docker-compose.yml` ganhou um serviço `env-check` que roda
  `deploy-check.sh` e bloqueia `api`/`web`/`caddy` (não `postgres` sozinho,
  pra não quebrar o fluxo de dev) se o `.env` estiver ausente ou com
  placeholder — antes dependia do operador lembrar de rodar o script à parte
  antes do `docker compose up`. Verificado: `docker compose config` válido,
  e `docker compose run --rm env-check` sem `.env` falha como esperado.
- **Meu perfil + esqueci minha senha (2026-09-23)**, seguindo o mesmo padrão
  do `pdv-web` (token opaco de uso único, só o hash SHA-256 persistido, TTL
  curto, nunca revela se o e-mail existe). Novo `MailService` (nodemailer,
  transporte `log` por padrão — só escreve no console — ou `smtp` de
  verdade); `MAIL_HOST`/`MAIL_AUTH_USER`/`MAIL_AUTH_PASS` obrigatórios em
  produção (env.ts + deploy-check.sh), senão `docker compose up` nunca
  ficaria de pé sem enviar e-mail de verdade. Tela "Meu perfil" (nome +
  e-mail num form, senha com a atual obrigatória noutro); trocar senha
  derruba toda sessão aberta em outro dispositivo, mantendo só a atual.
  Model `PasswordResetToken` (sem RLS, mesma exceção de User/Session).
  Verificado ao vivo de ponta a ponta com e-mail real via SMTP (Hostinger):
  pedido de reset → e-mail chegou → link abriu a tela certa com o e-mail da
  conta → senha trocada → login com a senha nova funcionou → editar nome em
  Meu perfil → trocar senha com a atual errada (rejeitou) e depois certa
  (funcionou, sessão atual não caiu).
- **Front: tela de Extrato (2026-09-25)** — `app/(app)/movements` (5.2/5.3, fiel a `19-extrato`): fundo Fog
  com folha branca, "Entrou/Saiu" do mês (`GET /movements/totals`), filtros por conta, Entradas/Saídas e
  busca com debounce, navegação de mês, lista agrupada por dia. Topo redesenhado a pedido do usuário
  ("horrível, quero mais profissional, mobile, clean"): cabeçalho de uma linha (título + `MonthStepper`),
  `StatementSummary` em card, busca, `SegmentedControl` Tudo/Entradas/Saídas e chips de conta com rolagem
  horizontal (`AccountFilter`, só com 2+ contas) — dropdown e pílulas soltas saíram; `MonthStepper` e
  `SegmentedControl` são componentes compartilhados com teste Cypress. Sinal (+/−) e rótulos ("entre suas contas",
  "fatura do cartão") saem só do `kind` que a API já classificou (`lib/utils/movement-kind.ts`); TRANSFER não
  leva sinal porque não diz o lado. Sem categoria, pessoa nem divisão (só cartão). O segmentado
  "Cartão | Extrato" virou o componente `CardStatementSwitch` (Início e Extrato), com teste Cypress; o
  "Extrato" da Início deixou de ser inerte. Novos: hooks `use-movements`/`use-movement-totals`,
  `use-debounced-value`, `shiftMonthKey`, `formatTime`. Verificado ao vivo no Chrome com dado real
  (InfinitePay/PicPay/Banco do Brasil): filtro de entradas, busca "cofrinho" combinada com o filtro, mês
  anterior. Typecheck/lint/Prettier limpos, 17 testes de componente. **Falta**: rótulo "transferência entre
  suas contas" só aparece se o sync classificar como TRANSFER (5.4 do backend ainda não detecta), nota por
  movimentação (5.5), versão desktop (`d09-extrato`).
- **Backend: `insight` (9.1) corrigido + 9.4 (2026-09-25)**, a pedido do usuário, antes de fazer a tela
  "Para onde vai" (o front não pode consertar dinheiro). `GET /insights/spending` agora: (1) só a parte do
  dono em total/categoria/estabelecimento (`byPerson` continua com todas); (2) parcela conta no mês em que
  cai, não tudo no mês da compra; (3) mês corrente compara até o mesmo dia (`throughDay`, `null` = mês
  inteiro); (4) `aboveNormal` por categoria (> 140% da média dos 3 meses, exige os 3 meses com dado);
  (5) grupo com líquido zero some. Um repositório, uma consulta (`findRows`), sem 4 idas ao banco.
  Verificado ao vivo com dado real: `throughDay` 25 em setembro e `null` em agosto; total de setembro
  (R$ 3.933,45) = linha "Eduardo" de `byPerson` = soma das categorias = soma dos estabelecimentos;
  achou e corrigiu "UBER R$ 0" (compra + estorno). 346 testes da API. **Achado de dado**: quase tudo está
  "Sem categoria" (R$ 3.803 de R$ 3.933) e ~47% "Sem estabelecimento" — o Pluggy nem sempre manda
  `merchant` e o sync só categoriza via `Rule`; o relatório por categoria vai parecer vazio até isso melhorar
  (categorização automática, 4.5, ou IA, 10.1). Limite: a "parcela k cai (k−1) meses depois da compra" é
  aproximação — o banco não dá a data de lançamento por parcela.
- **Dados de teste no banco de dev (2026-09-25)**, a pedido do usuário: 172 despesas de cartão dos últimos
  meses foram categorizadas por padrão de nome (Saúde, Alimentação fora, Assinaturas, Lazer, Combustível,
  Transporte, Compras, Contas fixas) via `PATCH /transactions/:id/category`, **sem** criar `Rule` (nada muda
  em futuros syncs) e sem tocar em lançamento já categorizado. Só o banco de dev; não vale como categoria
  "de verdade". Serviu para exercitar `aboveNormal` (Saúde, Assinaturas e Alimentação fora saíram
  sinalizadas em setembro). Para desfazer: `UPDATE ... SET categoryId = NULL` na janela de `updatedAt` dessa
  operação (172 linhas, 2026-09-26 03:09 UTC).
- **Front: Relatórios — "Para onde vai" (2026-09-25)** — `app/(app)/reports` (9.1, `15-relatorio-categorias`):
  título + `MonthStepper`, total "na sua parte, até o dia N" (`throughDay` da API), `SegmentedControl`
  Categorias/Lugares/Pessoas e linhas com barra proporcional, valor e variação vs. média dos 3 meses; o selo
  de alerta só aparece quando a API marca `aboveNormal` (regra do backend). "Relatórios" saiu do estado
  "em breve" nas duas navegações. Extraído `useMonthNavigation` (Extrato e Relatórios). Só a aba "Para onde
  vai": Assinaturas e Economizar ficam sem botão até existir backend (9.2, 9.3, 9.5). Verificado ao vivo no
  Chrome com dado real: total R$ 3.933,45 (setembro, até o dia 25), selo em Saúde/Assinaturas, visões
  Lugares e Pessoas, mês anterior sem "até o dia" (mês fechado). Achou e corrigiu: barras com escalas
  diferentes por causa da largura do selo (coluna de variação agora fixa). **Falta**: versão desktop
  (`d06-relatorios`, duas colunas com "Onde economizar").
- **Backend: assinaturas (9.2) (2026-09-25)** — `GET /insights/subscriptions` (sem parâmetro de mês: é um
  retrato de agora, olhando 12 meses). Detector puro em `subscription.mapper.ts`: mesmo estabelecimento (ou
  descrição normalizada, com espaços colapsados), valor ±10%, intervalo 26–34 dias, >= 3 ocorrências, só a
  parte do dono, sem parcela e sem estorno, ativa = última cobrança há <= 40 dias. Tenta cada cobrança como
  âncora (da mais recente pra trás), então uma compra avulsa depois da última mensalidade não esconde a
  assinatura. Devolve `totalMonthlyCents`, `totalYearlyCents` (12x, no backend) e itens com `chargeDay`
  ("todo dia N"). Verificado ao vivo com dado real: 7 assinaturas plausíveis (internet, Prime Video, Spotify,
  Uber, Amazon, Apple, Best Laser), R$ 308,41/mês e R$ 3.700,92/ano. 367 testes da API. **Falta**: aba
  Assinaturas no front (`16-relatorio-assinaturas`); 9.3 (cobrança duplicada) e 9.5 (onde economizar).
  Code review: cobrança com data futura passou a ser ignorada (teste); `CLAUDE.md` dizia
  `America/Sao_Paulo` mas o fuso do produto é `America/Manaus` desde a 3.5 — corrigido. **Limitação
  conhecida**: estorno não anula a cobrança original nas assinaturas (o spec não pede), então uma cobrança
  estornada ainda conta como ocorrência; o valor mensal não é afetado (vem da última cobrança).
- **Front: aba Assinaturas em Relatórios (2026-09-25)** — `reports` ganhou abas "Para onde vai | Assinaturas"
  (`16-relatorio-assinaturas`): total por mês, "em N assinaturas", total por ano e a lista com "todo dia N ·
  última em DD/MM" (a data da última cobrança ajuda a notar assinatura que parou). O seletor de mês só
  aparece em "Para onde vai" (assinaturas são um retrato de agora). `formatDisplayName` novo: nomes do Pluggy
  vêm em CAIXA ALTA e agora saem em caixa mista (só quando o nome inteiro está em maiúsculas), aplicado nas
  assinaturas, nas linhas de relatório e no Extrato. Backend: o nome vindo da descrição do cartão perde a
  cidade colada depois de um bloco de espaços ("PG *NIO FIBRA RIO DE JANEIR BR" → "PG *NIO FIBRA").
  Verificado ao vivo no Chrome: R$ 308,41/mês em 7 assinaturas, R$ 3.700,92/ano. 369 testes da API.
  **Falta**: aba "Economizar" (backend pronto, falta o front), versão desktop (`d06`/`d07`), aviso "X e Y
  somam R$ por mês".
- **Backend + front: onde economizar (9.3, 9.5) (2026-09-28)** — `duplicate-charge.mapper.ts` (mesmo
  estabelecimento e valor em até 24h, só a fatia do dono) e `savings.mapper.ts` (junta cobrança duplicada,
  categoria acima do normal e assinatura ativa num ranking por potencial, cada item com o cálculo em texto e
  a chave de origem). `GET /insights/savings?month=AAAA-MM` reaproveita `spendingReport` e `subscriptions`
  já existentes. Code review corrigiu bug: a duplicidade estava usando o mês da parcela em vez da data real
  da cobrança. Aba "Economizar" em Relatórios (protótipo 17): total do mês e a lista, sem o link "ver
  compras" do protótipo (falta navegação por transação). Verificado ao vivo no Chrome com dado real. 379
  testes da API, 19 de componente, typecheck/lint/Prettier limpos.
- **Backend: sugestão de categoria por IA (10.1) (2026-09-28)** — decisão de escopo do Épico 10: só 10.1 por
  ora (o resto — 10.2 resumo mensal e 10.3 chat — cortado do backlog ativo até haver sinal real de falta;
  10.4 orçamento de tokens e 10.5 defesa contra injeção vieram embutidos na implementação, não como itens
  separados). `GroqClient` (`apps/api/src/modules/ai`): chamada crua via fetch (mesmo padrão do
  PluggyClient, sem SDK), sem chave configurada = recurso desligado (app funciona inteiro, categorização cai
  pras regras). Trocado de Claude pra Groq em 2026-09-28 (camada gratuita; formato compatível com OpenAI,
  `console.groq.com`) — decisão do usuário, spec 02/10 atualizados. Modelo padrão `openai/gpt-oss-20b`
  (`llama-3.1-8b-instant` foi descontinuado pela Groq, achado testando com chave real): é raciocinante,
  precisa de `reasoning_effort: low` (senão gasta todo `max_tokens` "pensando" e a resposta vem vazia) e
  embrulha o JSON em bloco de código, tratado no mapper. **Testado com chave real**: 40 transações
  categorizadas de verdade (ex.: "MERCADOLIVRE*MERCADOL" → Compras, 90% de confiança, aplicada direto),
  4.361 tokens registrados em `AiUsage`. `category-suggestion.mapper.ts` valida a resposta (JSON inválido, categoria inexistente,
  index fora do lote, confiança fora de 0-100 = descartado item a item, nunca a resposta inteira).
  `CategorySuggestionService`: só busca transação sem `categoryId` e sem `categorySuggestedId` (nunca
  sobrescreve confirmada); cache por estabelecimento normalizado (reaproveita sugestão já dada, sem nova
  chamada); confiança >= 70 aplica a categoria direto, abaixo só fica como sugestão; `AiUsage` por
  User/mês trava a chamada ao estourar `AI_MONTHLY_TOKEN_BUDGET`; falha da IA nunca quebra (degrada pra
  "sem sugestão"). `POST /ai/suggest-categories`. Migration `add_ai_category_suggestion_and_usage` com RLS
  na tabela nova. Code review: limite de tokens da resposta (1024) era baixo demais pra um lote de 40
  transações e podia truncar o JSON e descartar o lote inteiro já cobrado do orçamento (subiu pra 4096);
  falha da IA agora reporta o que já foi aplicado pelo cache em vez de esconder o progresso.
- **Front: chip de sugestão na Fatura (2026-09-28)** — `useTransactionsPage` dispara
  `POST /ai/suggest-categories` uma vez ao abrir a tela (fire-and-forget, backend decide sozinho se está
  desligado/orçamento estourado/nada a fazer); linha sem categoria com sugestão mostra um chip "Sugestão: X
  · toque para aceitar" no lugar de "Sem categoria" — um toque aplica direto, sem abrir a folha de edição
  (mesma filosofia de "toda transação nasce Meu, correção é 1 toque"). `Transaction` ganhou
  `categorySuggestedId`/`categorySuggestionConfidence` no schema compartilhado. Verificado ao vivo no Chrome
  (sugestão simulada direto no banco de dev, já que a IA fica desligada sem `GROQ_API_KEY`): chip
  apareceu, toque aplicou a categoria e sumiu o chip. 404 testes da API, 19 de componente, typecheck/lint/
  Prettier limpos. Épico 10 fechado por ora (só 10.1 — ver decisão de escopo acima).
- **Chave Groq real ligada + robots.txt + PWA (2026-09-28)** — usuário conseguiu a `GROQ_API_KEY` de
  verdade. Achado testando: `llama-3.1-8b-instant` foi descontinuado pela Groq; troca pro
  `openai/gpt-oss-20b` (raciocinante, precisa `reasoning_effort: low` e o mapper agora tolera JSON
  embrulhado em ` ```json `). Rodado contra dado real: 40 transações categorizadas, ex.
  "MERCADOLIVRE*MERCADOL" → Compras (90%). `robots.txt` (`app/robots.ts`, `Disallow: /`) — precisou liberar
  a rota no middleware de auth, senão nem o robô conseguia ler o arquivo. **PWA instalável (11.1)**:
  `app/manifest.ts` (ícones de `brand/` copiados pra `public/icons/`), `public/sw.js` hand-rolled (sem
  next-pwa/workbox — só fetch + Cache API: cache-first pra `_next/static`/ícones, network-first pra `/api/*`,
  o que naturalmente cacheia o último mês visto), registrado via componente client no layout raiz, limpo no
  logout (`use-logout.ts`). `apps/web/public/sw.js` estava sendo ignorado à toa no `.gitignore` (resquício
  de tentativa anterior) — corrigido, senão o arquivo nunca seria commitado. Verificado ao vivo no Chrome:
  SW registrado e ativo, cache de API populado, `caches.keys()` esvaziado depois do "logout" simulado.
  typecheck/lint/Prettier limpos, 19 testes de componente passando.
- **2FA TOTP (1.6) (2026-09-28)** — `apps/api/src/common/security/{encryption,totp}.ts`: AES-256-GCM (chave
  `DATA_ENCRYPTION_KEY`, primeiro uso de verdade dessa variável no projeto) e TOTP RFC 6238 implementado na
  mão com `node:crypto` (sem dependência nova; vetor de referência do RFC bate no teste). `User` ganhou
  `totpSecret`/`totpEnabledAt`/`totpLastUsedStep`; `TwoFactorRecoveryCode` (10 códigos, hash argon2, uso
  único) e `TwoFactorChallenge` (ponte "senha confirmada" → "sessão criada" quando 2FA ligado, 5 min, mesmo
  formato de token opaco do reset de senha) — as duas sem RLS, mesma exceção de User/Session (guarda de
  lint em `eslint.config.mjs`). Login vira `LoginResult` discriminado (`OK` | `MFA_REQUIRED`); token nunca
  no corpo da resposta, só no cookie (achado e corrigido no teste: o helper `applySessionCookie`
  centraliza isso pras duas rotas de login). Reuso do mesmo código TOTP dentro da janela ±1 é recusado
  (`totpLastUsedStep`). Front: `/settings/security` (QR via `qrcode`, código manual, confirmação, códigos
  de recuperação mostrados uma vez, desligar com senha) e o passo de código no `/login`. **Testado ao vivo
  com chave `DATA_ENCRYPTION_KEY` real**: liguei o 2FA de verdade (QR escaneado via código calculado à
  mão), login completo com código TOTP real, login com código de recuperação (e reuso corretamente
  recusado), desligar com senha errada recusado e com senha certa funcionando. 432 testes da API (73 só
  de auth/2FA), 19 de componente, typecheck/lint/Prettier limpos.
- Próximo: redesenho por tela do desktop (grid 2 colunas, `d0X-*`), ou pendências (5.4/5.5 rótulos de
  movimentação, 8.4's job/e-mail, resto da Sprint 8: 1.7/1.8, 7.5/7.6, 11.2/11.3, 12.x), ou revisitar
  10.2/10.3 se fizer falta na prática.

## Decisões já tomadas (2026-09-21)

- **2026-09-25 — Envelopes, alertas 70/90/100 e a tela Orçamento descartados.** Continuam: teto (renda),
  ritmo, gastos fixos, o card principal da Início (soma dos cartões + gastos fixos) e a tela Renda.
  Removidos da API o módulo `envelope` e o `AlertService`, e de `packages/shared` o schema de envelope;
  migration `20260926030000_drop_envelopes_and_alerts` apaga só `Envelope`, `EnvelopeAlert` e
  `BudgetMonthAlert`. Um primeiro corte apagou orçamento demais (ritmo, renda, gastos fixos e o card da
  Início) e foi desfeito: no banco de dev, `BudgetMonth` e `FixedExpense` foram recriadas vazias (os
  dados que havia nelas se perderam — renda e gastos fixos precisam ser cadastrados de novo). Lições:
  recriar tabela com `psql` como superusuário deixa o dono errado (o papel da API é `gastos`; `ALTER
TABLE ... OWNER TO gastos`), e o `migrate dev` acusa "drift" nesse caso — usar `migrate diff` +
  `migrate deploy`, nunca `migrate reset`.

- **Cartão = só cartão de crédito.** Débito, Pix, TED, boleto e saldo de
  benefício (VR/VA) são movimentações: só consulta, área separada.
- **Benefício (VR/VA) é renda informada** no orçamento; Bee Vale e InfinitePay
  são contas de movimentação, sem regra própria.
- **Gasto de terceiros no cartão é subtraído**, sem cobrança/saldo por pessoa.

- **Estilo visual: Wise** (Forest Ink + lima, pílulas, display 900) —
  `apps/web/docs/DESIGN_SYSTEM.md`. Referência de estilo, não de marca. Fonte
  do display: **Inter 900** (a Wise Sans é proprietária). Tema **claro** no v1.

- **Nome do produto: AbacaTudo.** O repositório continua `gastos-web` (nome
  técnico); "AbacaTudo" é o nome que o usuário vê.
- **Sessão dura 30 dias sem uso** (janela deslizante), em vez de 7. Ver
  `docs/specs/08-seguranca.md` § 4.

- **Logo: abacate em pose de ioga** (`brand/`). Ícones do PWA já gerados
  (512, 192, 180, maskable). Só sobre fundo claro; mínimo 56px.

- **Toda transação nasce "Meu" (2026-09-22)**: sem fila "a classificar" —
  padrão é o Dono (`Person isSelf`), o User corrige (troca a pessoa ou
  divide) quando for de outra pessoa. Muda o pipeline de atribuição de
  pessoa e a fatura (agora só `Fatura = Meu + Não é meu`) — ver
  `docs/specs/03-regras-negocio.md` § Atribuição de pessoa e § Só a minha
  parte. HU 4.1 do backlog foi reescrita de acordo (era "caixa a
  classificar", virou "corrigir pessoa em 1 toque").

- **Uso individual (2026-09-21)**: só o dono usa. O convite de outra pessoa (HU 1.4) sai do escopo. O
  isolamento por usuário no banco (RLS) continua, porque custa pouco e é uma proteção extra.

## Decisões em aberto (resolver antes da sprint indicada)

- [ ] **Girar o Client Secret do Pluggy**: ele foi colado numa conversa (fica no histórico dela). Gerar um
      novo no painel do Pluggy antes de usar em produção. A API Key colada expira sozinha em 2 horas.
- [x] **Auditoria de segurança (2026-09-28)** — 5 categorias (isolamento/RLS, permissão no front, IDOR,
      segredo exposto, XSS): só 1 achado real, corrigido — `docker-compose.yml` tinha fallback
      `${POSTGRES_PASSWORD:-postgres}`/`${APP_DB_PASSWORD:-gastos}` que o `deploy-check.sh` não detectava
      (só checava placeholder tipo `gere-`, não o valor literal do fallback); `deploy-check.sh` agora
      recusa esses dois valores especificamente. RLS, IDOR e XSS sem achado (confirmado sistematicamente,
      não amostra) — ver detalhe na conversa. Sem exposição de rede (Postgres não publica porta em
      produção), por isso severidade média, não crítica.
- [x] **Colocar `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` novos direto em `apps/api/.env`** — feito pelo
      usuário em 2026-09-22; usado pra testar `connect` contra a API real (achou e corrigiu 1 bug, ver
      Sprint 6). Falta só autorizar de verdade (o usuário loga no banco) pra testar `checkStatus`/sync.
- [ ] **`RecentAuthGuard` (HU 1.7, reautenticação) não existe ainda** — deferido na Sprint 1. O endpoint
      `POST /banking/items` (conectar banco) por enquanto só tem o `AuthGuard` normal, sem reautenticação
      recente. Registrar como gap até decidir se entra antes do Sprint 6 "fechar" ou fica pra
      Configurações (Sprint 8).
- [ ] **Job diário de sync** (`@nestjs/schedule`) não existe — só o `POST /banking/items/:id/sync` manual e
      o sync automático na primeira vez que o status vira `UPDATED`. Entra quando o Sprint 6 fechar.
- [ ] **Retenção/uso de dados da API de IA contratada** (Sprint 7, HU 10.1):
      confirmar e registrar em spec 10 antes de ligar em produção.
- [ ] **Estados de orçamento (OK/Atenção/Estourou)**: o estilo não define
      cores de status; adaptei (Linen/Forest, Fog+contorno, Alarm Red, sempre
      com ícone e texto). Validar no protótipo (Sprint 0, HU 0.7).
- [ ] **Uso dos logos de bancos** (Nubank, BB, PicPay em `brand/bancos/`):
      confirmar o guia de marca de cada um e a licença. O logo do BB veio em
      azul único, sem o amarelo da marca; conferir se é a versão permitida.
- [ ] **Provedor de SMTP** e domínio final (Sprint 8, HU 1.4/1.5).
- [ ] **Bee Vale / InfinitePay**: como o dono exporta extrato (formato CSV/OFX)
      para desenhar o mapa de colunas (HU 3.2).

## Sprint 0 — Fundação técnica

- [x] 0.1 — Monorepo pnpm + Turborepo, `packages/config`, `packages/shared`
- [x] 0.2 — `apps/api` bootstrap (contexto de usuário, `AuthGuard` fechado por padrão, `DomainError`, Prisma com extensão de RLS, throttler, `/health`). 37 testes; verificada contra Postgres real (health com banco ligado e desligado, 413, 400, rate limit 429).
- [x] 0.3 — `apps/web` bootstrap (Next.js + Tailwind + tokens, `api-client`, CSP com nonce, `Button` e `MoneyText`). 10 testes de componente (Cypress); renderiza com 0 violações de CSP.
- [x] 0.4 — Dockerfiles + compose. Stack completa testada pelo Caddy: domínio único, HSTS/CSP/nosniff, HTTP→HTTPS, sem porta exposta além de 80/443, processos sem root, docs da API desligados em produção.
- [x] 0.5 — CI (`.github/workflows/ci.yml`: audit, format, lint, tipos, testes, build, testes de componente, build das imagens). **Ainda não executada no GitHub** (repositório sem remoto).
- [x] 0.6 — Spike Pluggy **concluído em 2026-09-21**, com dado real (Nubank via Meu Pluggy). Catálogo (InfinitePay existe, Bee Vale não), custo (plano pago inviável; caminho = Meu Pluggy) e **formato dos dados** verificados: spec 07 § Resultado do spike e § Formato dos dados.
- [x] 0.7 — Protótipo das telas (23 telas mobile em 7 fluxos + 11 telas desktop, estilo Wise): https://claude.ai/artifact/CAyHffJCJ5wDrutNeEai1k. Falta validar: estados de orçamento

- [x] 6.3–6.5 — Conta do mês por pessoa pelo WhatsApp (manual, sem telefone guardado). Etapas:
  - [x] spec: 00, 03 § Mensagem de conta, 06, 08 e CLAUDE.md (a decisão "sem cobrança" virou "só mensagem manual")
  - [x] API: `Transaction.displayName` (migration) + `PATCH /transactions/:id/display-name` (vale p/ todas as parcelas)
  - [x] API: cálculo por pessoa + formatador do texto (funções puras, invariante Meu + pessoas + sem dono = fatura)
  - [x] API: `GET /invoice/statements?month=` (aberta no mês atual, prevista em mês futuro, manual pelo mês calendário)
  - [x] Web: botão "Enviar contas" (folha com WhatsApp/Copiar, aviso se o link passar de ~2000 caracteres) e
        "Nome na fatura" no detalhe da compra. Falta conferir ao vivo no celular (abrir o WhatsApp de verdade) e
        decidir o que fazer com compra sem dono (`personId` nulo) — hoje fica fora de qualquer mensagem

- [x] Card de ritmo da Início: no lugar de "R$ X abaixo/acima do ritmo" mostra "Nos cartões R$ X" (soma da
      fatura de todos os cartões, `cardsTotalCents` no `/budget/pace`). O `diffCents` continua na API. Falta
      conferir ao vivo

- [x] Card de ritmo acompanha o mês das setas da Início: mês futuro usa `getSummary(userId, month)` (fatura prevista
      dos cartões) + gastos fixos, sem selo nem marcador de hoje, rótulo "Meu previsto em …". Além do mês
      seguinte o teto é projetado do mês configurado mais recente (só em memória, nada gravado). Falta conferir
      ao vivo

- [x] 5.6–5.8 — Extrato e resumo da conta de benefício, com Pix por favorecido. Etapas:
  - [x] spec: 00, 03 § Extrato e relatório da conta de benefício, 06, 08 e CLAUDE.md (exceção controlada à regra
        "Movimentações sem relatório" e ao § 13 de privacidade do Pix)
  - [x] API: `GET /movements/report?accountId=&month=` (resumo, ritmo, saídas por dia), `GET /movements/pix-recipients`
        (por favorecido) e `GET /movements/pix?recipient=` (detalhe), funções puras em `movement-report.mapper`,
        testes com 2 usuários. Só Pix enviados, detectados pela descrição "Pix …"
  - [x] Web: `/movements/benefit` com "Extrato | Resumo", saldo e ritmo no topo, seletor de mês, entrada pelo card
        do benefício da Início e por um link no Extrato
  - [x] Web: aba Resumo (barras de saídas por dia, resultado) e Pix por favorecido com busca e detalhe. Falta
        conferir ao vivo no celular com os dados reais (74 Pix / 26 favorecidos no banco de dev)
  - [x] 5.10 — Gastos que se repetem no benefício: `GET /movements/habits` (recorrentes com o detector do cartão sobre
        os últimos 4 meses + estabelecimentos mais frequentes do mês, sem Pix) e seções na aba Resumo. Falta
        conferir ao vivo; categorias ficam para depois
  - [x] 5.11 — Para onde vai, por estabelecimento (`GET /movements/spending`, top 10 + outros, Pix e fatura à parte;
        seção na aba Resumo). Falta conferir ao vivo. Categorias (mesma lista do cartão) seguem para depois
  - [ ] Depois (P2): marcar favorecido como pessoa/estabelecimento; tipo de Pix real (`operationType`)

- [x] Parcelas estimadas na fatura prevista (BB e Pic Pay não mandam as futuras). Etapas:
  - [x] spec 03 § Fatura prevista (estimada = mesmo valor e vencimento mês a mês, nunca gravada, some quando o banco lança)
  - [x] API: `estimateInstallments` (função pura, recalculada a cada consulta) + fatura/resumo/ritmo/mensagem de conta
        incluem as estimadas (`estimatedCents`, "estimada" no texto) + `GET /invoice/estimates`
  - [x] Web: nota "inclui R$ X estimados" e seção "Parcelas estimadas" na Fatura; textos da Início. Falta conferir ao
        vivo com BB e Pic Pay

### Bugs achados só ao rodar de verdade (e corrigidos)

- Parcelas estimadas duplicadas no BB: a descrição do BB traz o marcador no meio (`RAMSONS STUDI PARC 05/12
MANAUS      BR`) e a data da compra varia entre parcelas (17 e 18/02), então `installmentGroupKey` tratava
  cada parcela como uma compra e a estimativa gerava 10 parcelas em outubro em vez de 3. Agora a chave tira o
  marcador da própria parcela em qualquer posição, junta espaços e usa só o mês da compra (testes com as
  descrições reais do BB e do Nubank). Afeta também a fatura atual e o nome na fatura do BB

- Payload > 1 MB devolvia 500 em vez de 413; JSON malformado vazava a mensagem crua da biblioteca.
- Container da API em loop de reinício: `prisma generate` na inicialização falha para usuário sem root.
- Dependências transitivas com 6 vulnerabilidades altas (`multer`, `postcss`, `deepmerge-ts`), corrigidas via `overrides` no `pnpm-workspace.yaml` (remover quando as dependências diretas trouxerem a versão corrigida).
- `/api/health` do web conflitava com o roteamento do Caddy (`/api/*` vai para a API): o health do web é `/healthz`.

## Sprint 1 — Auth + isolamento por usuário

- [x] 1.1 — RLS por `user_id` (User/Session isentas, documentado) + prova manual com psql (0 linhas sem contexto, INSERT de outro usuário recusado, `gastos` sem superuser/bypassrls). Ainda falta o teste automatizado com 2 Users — só existirá endpoint para provar isso via HTTP a partir da Sprint 2 (Person/Category ainda não têm Controller); a política em si já está ativa e será exercida pelos testes de isolamento dos módulos futuros.
- [x] 1.2 — Login e-mail/senha (argon2id, rate limit por e-mail **e** IP a 5/15min, cookie `__Host-gastos_session`). Verificado num navegador real (Chrome): o cookie `Secure` é aceito em `http://localhost` (contexto seguro), `httpOnly` de fato invisível a `document.cookie`
- [x] 1.3 — Sessão de 30 dias sem uso (janela deslizante, cookie renovado a cada request autenticado), logout revoga no servidor, listar/encerrar sessões (`GET /auth/sessions`, `DELETE /auth/sessions/:id`)
- [x] 1.9 — Seed do primeiro usuário (idempotente, testado rodando 2x), cria `Person` self e as 13 categorias padrão

### Decisões e gaps encontrados nesta sprint

- **RLS não pode ser gerido pelo `AuthGuard`, só por uma Middleware.** Um `CanActivate` não consegue
  envolver o `next.handle()`/handler no `AsyncLocalStorage.run()` — corrigido no spec 08 § 1. A
  resolução da sessão (e o estabelecimento do contexto) ficou no novo `SessionMiddleware`; o `AuthGuard`
  só confere se já foi resolvido.
- **`prisma migrate dev` precisa de um banco-sombra**, que exige `CREATEDB` — o papel `gastos` não tem
  (nem deveria, spec 08 § 1). Solução: `SHADOW_DATABASE_URL` aponta para o superusuário só em dev
  (`.env.example` do `apps/api`); produção nunca usa `migrate dev`, só `migrate deploy`.
- **Gap no backlog**: não existe HU dedicada para "trocar minha senha" logado (a 1.5 é só "esqueci a
  senha"). `revokeSession`/listagem cobrem "posso encerrar sessões"; falta decidir onde entra a troca de
  senha e se ela revoga as outras sessões, antes de Configurações (Sprint 8).
- **Seed em produção**: `pnpm db:seed` usa `ts-node`, que não existe na imagem de produção (só
  dependências de produção). Falta um caminho de seed para o primeiro deploy real — registrar como
  item da Sprint 8 (checklist do primeiro deploy, 12.5).
- **`argon2` faltava no `package.json`** (fiquei só na regra do spec) — adicionado.

## Sprint 2 — Contas, pessoas, categorias, import

- [x] 2.1 — Contas (`Account`: CREDIT_CARD/CHECKING/CASH, RLS, closingDay/dueDay/creditLimitCents só em cartão)
- [x] 2.2 — Pessoas (CRUD + arquivar; self nunca arquivável)
- [x] 2.4 — Categorias (CRUD + renomear + arquivar; nome único por usuário, 409 em duplicata)
- [x] 3.5 — Fuso `America/Manaus` (mudou de São Paulo pra Manaus a pedido do usuário; `common/date/timezone.ts`)
      **Ordem do que falta (a pedido do usuário, 2026-09-22): lançamento manual por último.**

- [x] ~~3.1 — Import OFX/CSV com pré-visualização~~ **pulado a pedido do usuário (2026-09-22)**: a fonte de
      dado passou a ser a API do Pluggy direto, não arquivo. Ver Sprint 6.
- [x] 3.4 — Lista e filtros: básico pronto (`GET /transactions?month=`, `GET /movements?month=`, filtro por
      mês em America/Manaus); filtro por categoria/pessoa/texto fica pra quando existir UI pra isso
- [x] 3.3 — Lançamento manual, testado ao vivo
- [x] 5.1 — `Account.type` decide o escopo (sem campo de canal por lançamento); `TransactionRepository`
      (só `CREDIT_CARD`) e `MovementRepository` (o resto), mesma tabela `Transaction`, filtros diferentes

**Por que parei aqui**: o usuário pediu pra inverter a ordem — Pluggy (Sprint 6) antes de import/lançamento
manual, porque puxar dado de verdade é melhor teste do que simular. 3.1 saiu do escopo; 3.4 e 5.1 saíram
prontos como efeito colateral de construir `Transaction`/`banking` pro Pluggy. Falta só 3.3.

Lição desta etapa: ao provar isolamento entre 2 usuários pela API, testei sem querer com `psql -U
postgres` (superusuário, que ignora RLS) e o resultado pareceu vazar dado do usuário 1 pro 2 — susto à
toa, era erro do meu teste, não do sistema. Refeito com `-U gastos` (o papel restrito de verdade) confirma
0 linhas para quem não tem nada. Lembrete pra mim mesmo: prova de RLS **sempre** com o papel da aplicação,
nunca com o superusuário.

## Sprint 3 — Classificação

Escopo mudou a pedido do usuário (2026-09-22): toda transação nasce "Meu", sem fila de pendência — ver
"Decisões já tomadas". 4.1 virou "corrigir pessoa em 1 toque".

- [x] 4.1 — Corrigir pessoa em 1 toque: `PATCH /transactions/:id/person`, testado ao vivo
- [x] 4.2 — "Sempre para este estabelecimento": `alwaysForMerchant` no mesmo endpoint, testado ao vivo
- [x] 4.4 — Dividir compra: model `Split`, preview + PUT + DELETE, testado ao vivo
- [~] 4.5 — Categorização automática: `Rule` decide (testado ao vivo); falta "mesmo merchant já confirmado
  pelo usuário" (gap consciente, ver "Em andamento agora") e a sugestão de IA (Sprint 7)

### Bugs achados só ao rodar de verdade (e corrigidos)

- `merchant` nunca vinha preenchido: o schema esperava `merchant.name`, mas o campo real do Pluggy é
  `merchant.businessName`. Achado ao testar a `Rule` contra dado real (sem merchant, "sempre para este
  estabelecimento" não tinha o que casar).

## Sprint 4 — Fatura só com a minha parte + Movimentações

- [x] 6.1 — Fatura: `GET /invoice?accountId=&month=`, total − não é meu = meu, testado ao vivo
- [x] 6.2 — "Meu" do mês (todos os cartões): `GET /invoice/summary?month=`, testado ao vivo
- [x] 5.2 — Extrato de movimentação: `GET /movements` com filtro de conta/direção/mês/busca, testado ao vivo
- [x] 5.3 — Totais de entrada/saída: `GET /movements/totals?month=`, testado ao vivo

### Bugs achados só ao rodar de verdade (e corrigidos)

- `resolveKind` mapeava todo `CREDIT` do Pluggy pra `REFUND` (correto só em cartão) — numa conta de
  movimentação isso fazia um Pix recebido virar "estorno". Agora `CREDIT` em conta não-cartão vira
  `INCOME`.
- O sync atribuía pessoa (padrão "Meu"/`Rule`) e categoria (via `Rule`) até em transação de movimentação,
  quando 03-regras-negocio diz que isso só existe em cartão. Agora `personId`/`categoryId` são sempre
  `null` fora de `CREDIT_CARD`, mesmo com uma `Rule` pro merchant.

## Sprint 5 — Orçamento e relatórios

- [x] 7.1 — Renda, fixos, poupança → teto variável: `GET`/`PUT /budget/month`, testado ao vivo
- [x] ~~7.2 — Envelopes: `GET/POST/PATCH/DELETE /budget/envelopes`, testado ao vivo~~ descartado (2026-09-25)
- [x] ~~7.3 — Alertas 70/90/100, testado ao vivo~~ descartado (2026-09-25)
- [x] 8.6 — "Última atualização" por conta, testado ao vivo
- [x] 9.1 — Para onde vai o dinheiro, testado ao vivo

## Sprint 6 — Integração Pluggy

Construída fora de ordem (2026-09-22), a pedido do usuário, em 3 etapas: model → `PluggyClient` → módulo
`banking`. **Verificado ao vivo e de ponta a ponta em 2026-09-22**: Docker recuperado, credencial nova do
usuário no `.env` (nunca colada no chat), `connect()` real, autorização de verdade no Chrome (o usuário
logou num Nubank real), `checkStatus` detectou `UPDATED` e disparou o sync sozinho, sync manual repetido
depois de cada correção. Resultado final: 2 contas (1 corrente, 1 cartão) e 1670 transações reais
sincronizadas sem duplicar, `/transactions` só com o cartão (409 compra + 3 estorno + 39 pagamento de
fatura) e `/movements` só com o resto — como o desenho previa.

- [x] 8.1 — Conectar banco: `POST /banking/items` cria o item Meu Pluggy (único conector gratuito, spike já
      provou isso) e devolve `authorizeUrl`; sem webhook, então o front faz _polling_ em
      `GET /banking/items/:id` (`checkStatus`) até sair de `WAITING_USER_INPUT`
- [x] 8.2 — Sync idempotente: upsert por `[accountId, externalId]` (`banking-sync.repository.ts`), nunca
      duplica; nunca sobrescreve `categoryId`/`personId`/`note` (são do usuário, não do Pluggy)
- [x] 8.3 — Sync diário/manual (sem webhook): `POST /banking/items/:id/sync` (manual) + primeira vez que o
      `checkStatus` vê o status virar `UPDATED` (automático). Job diário: `BankingSyncJob` (`@nestjs/schedule` 6.x, CJS — a 12.x é ESM-only e quebra no
      Jest/CJS), `@Cron` 03:00 America/Manaus, `pg_try_advisory_xact_lock`, um usuário por vez via `runAsUser`,
      falha de um item/usuário não derruba os demais; só itens não `DISCONNECTED`. Manual limitado a 1 por conexão a cada 15 min
      (`429 SYNC_TOO_RECENT`, pelo `lastSyncAt`). Falta: janela `lastSyncAt − 7d` (spec 07)
- [x] 8.4 — Aviso de reconectar + reconectar, testado ao vivo (falta job diário + e-mail, gap consciente)
- [x] 8.5 — Desconectar, testado ao vivo
- [x] Renomear conta: `PATCH /accounts/:id` aceita `name` (o sync nunca escreve o nome no update, então o nome
      escolhido sobrevive). Em Contas, cada linha tem um botão "⋯" que abre a folha de ações (editar nome,
      bandeira, conta de benefício, remover). Falta conferir ao vivo no celular
- [x] 2.3 — Cartão adicional → pessoa, testado ao vivo

### Bugs achados só ao rodar de verdade (e corrigidos)

- `createMeuPluggyItem` assumia que a `authorizeUrl` vinha pronta na resposta de `POST /items` — na prática
  o Pluggy devolve `parameter: null` e só popula o link OAuth uns 2s depois. Corrigido com um polling curto
  e limitado (`waitForAuthorizeUrl`, 5 tentativas de 1,5s) antes de desistir.
- `listTransactions` tratava o cursor `next` como URL absoluta e colava direto em `BASE_URL` — na prática o
  Pluggy manda só a querystring (`?accountId=...&after=...`), então cada conta parava na primeira página
  (500 transações) sem avisar erro nenhum. Corrigido montando o path certo (`/v2/transactions${cursor}`).
- `resolveKind` tentava achar pagamento de fatura pelo `operationType`, mas o Pluggy manda "PAGAMENTO" tanto
  pra compra parcelada quanto pro pagamento em si — nunca distinguia. O sinal certo é a `category`/
  `categoryId` que o Pluggy já classifica ("Credit card payment" / `05100000`), adicionado ao schema.

- [x] Fatura fechada fora do "Meu em [mês]": sem saldo anterior, `CARD_PAYMENT` não abate a aberta, e cartão com
      `closingDay` (Pic Pay) só conta lançamento depois do último fechamento (2026-10-02).

- [x] Teto por quinzena: renda em dois salários (dia 15 e dia 30), gasto fixo com quinzena de pagamento, linha
      da quinzena no card da Início (2026-10-02).

- [x] CI: `pnpm audit` falhava no `braces` (GHSA-vfj7-8cjw-p6xm, sem versão corrigida no npm; só ferramenta de dev do
      `apps/web`). Aviso ignorado de forma explícita em `pnpm-workspace.yaml`; remover quando sair `braces` >= 3.0.4
      (2026-10-03).

- [x] ~~Data do último fechamento por cartão~~ — feita e **removida** a pedido (2026-10-03): volta o dia fixo de
      fechamento (o banco antecipa em fim de semana, Nubank fechou em 26/09 e não 27; aproximação conhecida).

- [x] Fatura = quanto falta pagar: pagamento adiantado (sobra além da fatura fechada) abate a aberta na Início e na tela
      da fatura; total da fatura fechada informado em Contas ou vindo do Pluggy (2026-10-03).

- [x] ~~Fatura = quanto falta pagar~~ — feita e **removida** a pedido (2026-10-06): sem total da fatura fechada
      (`closedBillCents`) e sem pagamento adiantado; a fatura aberta é só a soma dos lançamentos abertos.

### Code review (2026-09-22) — 4 achados, todos corrigidos e reverificados ao vivo

- **`lastErrorCode` era campo morto**: existia na coluna e no DTO, mas nada escrevia nele — conexão com
  `LOGIN_ERROR`/`ERROR` não dava motivo nenhum pro usuário. `checkStatus` agora persiste `error.code` do
  Pluggy (schema `pluggyItemSchema` ganhou o campo `error`).
- **`listAccounts` não paginava**: a resposta real vem com `total`/`totalPages`/`page`, mas só a primeira
  página era lida — alguém com contas suficientes pra estourar uma página perdia o resto do sync
  silenciosamente. Corrigido com um loop limitado a `MAX_ACCOUNT_PAGES` (20).
- **Race de conta duplicada**: o dedup em `runSync` era "checa depois cria", não atômico — duas
  sincronizações simultâneas do mesmo item podiam criar duas contas pra mesma conta real. Fechado com
  `@@unique([userId, externalAccountId])` no schema (NULL nunca colide com NULL, então conta manual
  continua livre) e um `upsert` atômico em `AccountRepository.upsertFromSync`.
- **`occurredAt` usava a data errada em parcela**: dado real mostrou uma parcela com `date` quase 1 ano à
  frente de `creditCardMetadata.purchaseDate` (a data real da compra) — `date` é quando a parcela cai na
  fatura, não quando a compra aconteceu. Corrigido pra preferir `purchaseDate`; reverificado com sync real
  — as 3 parcelas de uma mesma compra agora compartilham a mesma `occurredAt`, em vez de espalhadas em
  meses futuros.

Todos os 4 reverificados contra Postgres real e uma nova autorização de verdade no Nubank (144 testes,
typecheck/lint/build limpos).

## Sprint 7 — Insights e IA

- [x] 9.2 — Assinaturas: `GET /insights/subscriptions` e aba em Relatórios, testado ao vivo
- [x] 9.3 — Cobrança duplicada: mesmo estabelecimento + valor em 24h (`duplicate-charge.mapper.ts`)
- [x] 9.4 — Categoria acima do normal: já saía em `byCategory.aboveNormal` desde o fix do 9.1
- [x] 9.5 — Onde economizar: `GET /insights/savings?month=AAAA-MM` e aba "Economizar" em Relatórios, testado
      ao vivo
- [x] 10.1 — Sugestão de categoria por IA: `POST /ai/suggest-categories` (10.4/10.5 embutidos) + chip na
      Fatura, testado ao vivo
- [ ] 10.2 — Resumo mensal (cortado do escopo ativo por ora — ver nota abaixo)
- [x] 10.4 — Orçamento de tokens e liga/desliga: `AiUsage` por User/mês, embutido em 10.1
- [x] 10.5 — Defesa contra injeção via descrição: dado delimitado por `<transaction>`, embutido em 10.1

## Sprint 8 — Segurança reforçada, convite, PWA, produção

- [ ] ~~1.4 — Convidar uma pessoa~~ — fora do escopo (docs/scrum/BACKLOG.md, decisão de 2026-09-21: uso
      individual; se voltar, exige que a pessoa tenha o próprio Meu Pluggy)
- [x] 1.5 — Redefinir senha: `POST /auth/forgot-password`/`reset-password`, telas `(public)/forgot-password`
      e `/reset-password`, 7 testes (só falta configurar o provedor SMTP de verdade em produção — hoje usa
      `MAIL_TRANSPORT=log`, ver pendência em "Provedor de SMTP e domínio final")
- [x] 1.6 — 2FA TOTP: setup (QR + segredo), confirmação, 10 códigos de recuperação, desafio no login,
      desligar com senha — testado ao vivo com chave real
- [ ] 1.7 — Reautenticação em ação sensível
- [ ] 1.8 — Exportar e excluir conta
- [x] 7.4 — Ritmo (por dia): `GET /budget/pace?month=`, testado ao vivo
- [ ] 7.5 — Parcelas futuras / fatura prevista (Home e Fatura navegam por mês). Plano em etapas:
  - [x] spec 03 § Fatura prevista (regras acordadas: só parcelas lançadas, mês de `date`, horizonte até a
        última parcela, ◀ trava no mês atual)
  - [x] API: coluna `Transaction.installmentDueAt` (migration; o sync grava a `date` do Pluggy; linhas antigas
        só ganham o valor no próximo sync) + `GET /invoice?month=` prevê o mês futuro (`isForecast`,
        `lastForecastMonth`) — a `occurredAt` é a data da COMPRA, então o mês da parcela precisou de coluna
  - [x] API: `GET /transactions?month=` devolve as parcelas do mês futuro (`installmentDueAt` no DTO)
  - [x] Web: `MonthStepper` com setas desabilitáveis; Home ("Faturas previstas") e Fatura ("Fatura prevista
        de …") navegam por mês via `useForecastMonth` (◀ trava no mês atual, ▶ até `lastForecastMonth`); a Home
        abre a Fatura com `?month=`
  - [x] Testes: Jest (cálculo, invariante, mês sem parcela, conta manual, mês inválido, 2 Users) + Cypress do
        `MonthStepper`. Falta conferir ao vivo: as linhas já sincronizadas só ganham `installmentDueAt` no
        próximo sync (job das 03:00 ou "Atualizar agora"), e a fronteira de mês em Manaus só foi testada por mock
- [ ] 7.6 — Congelar meses fechados
- [ ] 10.3 — Chat com tool use
- [x] 11.1 — PWA instalável: manifest, service worker (cache de assets/API, limpa no logout), testado ao vivo
- [ ] 11.2 — Ocultar valores (tema escuro é P2, precisa de desenho)
- [ ] 11.3 — Estados vazios/carregando/erro
- [ ] 12.1 — `/health` + uptime externo
- [ ] 12.2 — Backup criptografado + drill de restore
- [ ] 12.3 — Deploy via CI
- [ ] 12.4 — Redaction de log + alerta de sync parado
- [ ] 5.4 — Rótulo "transferência entre suas contas"/"pagamento de fatura"
- [ ] 5.5 — Nota opcional em movimentação
- [ ] 12.5 — Checklist do primeiro deploy
