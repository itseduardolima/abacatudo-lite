# Integração Bancária (Open Finance via Pluggy)

Substitui, neste projeto, o papel do spec 07 do `pdv-web` (multi-tenant/
white-label). Aqui o "difícil" é buscar dado de banco com segurança.

## Como funciona

Só instituições reguladas acessam Open Finance direto; para uso pessoal o
caminho é um **agregador**. Escolha: **Pluggy**. O sistema é **somente
leitura** — nunca inicia pagamento, Pix ou qualquer movimentação.

Fluxo (ver também `01-arquitetura.md`):

1. `POST /banking/connect-token` (exige reautenticação recente): a API
   autentica no Pluggy com `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` e emite
   um **connect token** de vida curta, atrelado ao User (`clientUserId`).
2. O front abre o widget **Pluggy Connect** com esse token. O usuário
   autentica **direto com o banco dentro do widget** — login/senha/consent
   nunca passam pela nossa API nem ficam no nosso banco.
3. Ao concluir, o front envia o `itemId`. A API **não confia nele**: consulta
   o Pluggy para confirmar que o item existe, pertence ao `clientUserId`
   daquele User e qual a instituição/status/consentimento.
4. Sync busca contas e transações (`banking.sync`), normaliza e roda o
   pipeline de negócio (03).

## Resultado do spike (0.6, 2026-09-21)

Feito contra o catálogo real (`GET /connectors?countries=BR`, 231 conectores) com a conta de
desenvolvedor, mais a página de preços e a documentação do Pluggy.

| Instituição     | Conector                                      | Open Finance | Cartão de crédito | Saúde  |
| --------------- | --------------------------------------------- | ------------ | ----------------- | ------ |
| Nubank          | #612                                          | sim          | sim               | ONLINE |
| Banco do Brasil | #611                                          | sim          | sim               | ONLINE |
| PicPay          | #651                                          | sim          | sim               | ONLINE |
| InfinitePay     | #777                                          | sim          | sim               | ONLINE |
| Bee Vale        | **não existe** (nem nenhum conector de VR/VA) | —            | —                 | —      |
| Meu Pluggy      | #200 `MeuPluggy`                              | via OAuth    | sim               | ONLINE |

- **A hipótese anterior estava errada**: a InfinitePay **tem** conector. O Bee Vale não: entra só por
  import OFX/CSV ou lançamento manual (e como é conta de movimentação e benefício é renda informada,
  isso quase não custa nada).
- **Todos autenticam por OAuth do Open Finance**, com CPF como único campo: o usuário é levado ao
  banco para consentir. Confirma o desenho: senha de banco **nunca** passa pela nossa API.
- Vários conectores marcam `supportsPaymentInitiation`. **Ignoramos**: o sistema é somente leitura e
  nunca chama nada de pagamento (08 § 14).

### Plano e custo: o ponto que mais pesa

| Opção                          | Custo                    | Serve para uso pessoal?                                                                  |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| Plano **Dados** (produção)     | a partir de R$ 2.500/mês | **Não.** Inviável para 1 ou 2 pessoas                                                    |
| Trial em produção              | 15 dias, sem cartão      | Só para testar (conectores diretos com dado real)                                        |
| Ambiente de desenvolvimento    | grátis, até 100 itens    | Sim para desenvolver; **a validar** com dado real (abaixo)                               |
| **Meu Pluggy** (conector #200) | grátis                   | **Sim, é o caminho.** Até 5 conexões ativas por usuário, sem webhooks, sem categorização |

**Caminho escolhido: Meu Pluggy.** O usuário cria conta em `meu.pluggy.ai`, conecta os bancos lá
(Nubank, BB, PicPay e InfinitePay são 4, cabem nas 5), e o AbacaTudo lê pelo conector `MeuPluggy`.
Cada pessoa convidada precisa da **própria** conta Meu Pluggy.

Consequências no desenho:

- **Sem webhook**: o sync é o **job diário + "atualizar agora"**. O webhook (abaixo) vira opcional e só
  faz sentido se um dia houver plano pago.
- **Sem categorização do Pluggy**: a categoria é nossa (regras + IA, spec 03 e 10). Já era o plano.
- **Dependência de um produto gratuito de terceiro**, que pode mudar. Mitigação: import OFX/CSV
  continua sendo P0 e é o plano B completo.

**Como o Meu Pluggy funciona (visto na conta do dono e no
[Guia de Acesso via API](https://meu.pluggy.ai/api-guide), em 2026-09-21):**

- É um **proxy** ("Data Passport"): o usuário conecta os bancos **uma vez** no Meu Pluggy e, na aba **Apps
  parceiros**, vê e **revoga** o que cada app pode ler. O consentimento de verdade fica no Meu Pluggy.
- O guia oficial manda conectar os itens do Meu Pluggy **no app de demonstração do painel do Pluggy** e
  ler pela API (`POST /auth` com `clientId`/`clientSecret` gera a API Key; `GET /accounts?itemId=...`).
  O `itemId` vem do item criado nessa conexão.
- Não existe listagem de itens na API (`GET /items` responde 401): **guardamos o `itemId` nós mesmos**.
- `GET /connectors/200` (MeuPluggy) responde normalmente com a API Key gratuita.
- O dono já tem o Nubank conectado no Meu Pluggy e um app parceiro do painel autorizado.

**Confirmado com dado real (2026-09-21), com o item do dono no Nubank:**

- **O caminho gratuito funciona.** A API criou o item pelo conector `MeuPluggy` com as credenciais gratuitas
  de desenvolvedor (o widget do demo só mostra sandbox, mas a API não tem essa trava). O fluxo é:
  `POST /items {connectorId: 200}` → item em `WAITING_USER_INPUT` com uma URL de autorização em
  `my.pluggy.ai/oauth/authorize` → o dono abre a URL, escolhe as contas e autoriza → o **próprio Pluggy**
  recebe o retorno (o `redirect_uri` é `api.pluggy.ai/items/oauth/callback`) e o item vira `UPDATED`.
  Nosso backend não trata código OAuth nenhum.
- **Sem expiração de consentimento** (`consentExpiresAt` veio `null`) e **o Pluggy sincroniza sozinho todo dia**
  (`nextAutoSyncAt` = +24h). O nosso job só lê.
- **Escopo pedido pelo Meu Pluggy é fixo e maior que o necessário**: contas, investimentos, cartões,
  empréstimos e identidade. Não dá para reduzir. O AbacaTudo **lê tudo o que a API entrega e persiste só**
  cartão de crédito e movimentações; investimentos, empréstimos e dados de identidade são descartados na
  borda (`PluggyClient`), nunca gravados.
- **Um item por usuário, com várias contas dentro**: o item do Nubank devolveu 2 contas (`BANK/CHECKING_ACCOUNT` e
  `CREDIT/CREDIT_CARD`). Só as contas marcadas na tela de autorização aparecem.

### Formato dos dados (o que o `PluggyClient` precisa tratar)

Verificado em 451 transações de cartão e 500 de conta corrente. Só formato e contagem, nunca valores.

| Assunto              | Como vem                                                                                                                                      | Regra no AbacaTudo                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint             | `GET /transactions` está **descontinuado (410)**. Usar `GET /v2/transactions?accountId=`                                                      | Sem `pageSize`/`limit`. Paginação por cursor: `next` vem como query string relativa (`?accountId=...`); `null` = acabou. Até 500 por página      |
| Histórico            | Cartão: **13 meses** (2025-09 a 2026-09) numa resposta só                                                                                     | Relatórios com "média dos 3 meses" já funcionam desde o primeiro sync                                                                            |
| Valor                | Decimal (`amount`), não centavos. Cartão: compra = `DEBIT` **positivo**; pagamento e estorno = `CREDIT` **negativo**                          | Converter com `Decimal` para centavos inteiros. **Decidir pelo `type`, nunca pelo sinal**                                                        |
| Parcelas futuras     | 21 transações **datadas no futuro**, todas `PENDING` e todas parceladas (o histórico vai até 2027)                                            | Não entram no mês corrente: alimentam "parcelas futuras" (spec 03). Regra: `date` > hoje (America/Manaus) = futura                               |
| Parcela x compra     | Em parceladas, `date` é a data da parcela e `creditCardMetadata.purchaseDate` a da compra (diferem em 46 de 63)                               | Cada parcela conta no mês de `date`; `purchaseDate` só para exibir                                                                               |
| Fatura               | `creditCardMetadata.billId` agrupa por fatura (12 faturas). Faltam nas 47 `PENDING`                                                           | A visão de fatura usa `billId`; sem `billId`, a fatura aberta pelas datas de `creditData.balanceCloseDate`                                       |
| Pagamento de fatura  | `type=CREDIT` + `operationType=PAGAMENTO`                                                                                                     | É o `CARD_PAYMENT`: fora do gasto (spec 03)                                                                                                      |
| Estorno              | `operationType=ESTORNO`                                                                                                                       | É o `REFUND`                                                                                                                                     |
| Tarifa               | `operationType=TARIFA`                                                                                                                        | Gasto normal, categoria "Tarifas"                                                                                                                |
| **Cartão adicional** | `creditCardMetadata.cardNumber` (final) por transação, e `creditData.additionalCards` na conta. O item tem **2 finais** (428 e 23 transações) | **`CardHolderHint` é viável direto**: final do cartão → pessoa. Resolve "empresto meu cartão" sem classificar à mão                              |
| Categoria            | Vem em **todas** as linhas (34 no cartão, 21 na conta), em inglês (`Groceries`, `Digital services`, `Shopping`...)                            | Vira `categorySuggested` inicial (grátis), com tabela de mapeamento para as nossas categorias em português. A qualidade se mede antes de confiar |
| Estabelecimento      | `merchant` só em ~23% das linhas; `description` = `descriptionRaw` sempre                                                                     | Normalizar o estabelecimento nós mesmos (regras + IA)                                                                                            |
| Conta corrente       | `operationType`: `PIX` (76%), `CARTAO` (débito), `TRANSFERENCIA_MESMA_INSTITUICAO`, `BOLETO`, `RESGATE_APLIC_FINANCEIRA`...                   | Confirma o escopo: tudo isso é **movimentação**, fora da gestão                                                                                  |
| Terceiros            | `paymentData.payer` / `receiver` trazem quem pagou/recebeu                                                                                    | Só na área Extrato; nunca em relatório nem na IA (08 § 13)                                                                                       |
| `id`                 | Único por transação                                                                                                                           | Chave de idempotência: `(accountId, externalId = id)`                                                                                            |

Fontes: [preços](https://www.pluggy.ai/pricing), [FAQ](https://docs.pluggy.ai/en/docs/get-started/faq),
[consentimentos](https://docs.pluggy.ai/docs/consents).

## Modelo

```
PluggyItem
  id, userId, itemId (Pluggy), institutionName, status
  consentExpiresAt, lastSyncAt, lastErrorCode
  (nenhum token de banco guardado; só o que for indispensável, criptografado)
Account
  pluggyItemId?, externalAccountId?, ...
```

- `itemId` do Pluggy é identificador, não credencial — mas ainda é tratado
  como sensível e nunca vai em log, URL de front ou mensagem de erro.
- Se o Pluggy exigir guardar algum token de retorno, fica **criptografado**
  com `DATA_ENCRYPTION_KEY` (AES-256-GCM, `common/crypto/data-encryption.ts`).

## Sincronização

- **Gatilhos**: diário (job), manual ("atualizar agora", 1 por conexão a cada
  15 min, `429 SYNC_TOO_RECENT`; o job diário e o `checkStatus` não sofrem o limite), webhook.
- **Idempotência**: upsert por `(accountId, externalId)`. Rodar duas vezes
  não muda nada.
- **Janela**: primeira conexão traz o histórico que o banco fornecer;
  sincronizações seguintes buscam de `lastSyncAt − 7 dias` (margem para
  lançamentos que mudam de pendente para lançado).
- **Falha parcial** (uma conta falhou): as demais atualizam; a com falha
  mostra "última atualização" antiga e o motivo. Nunca apresentar número
  parcial como completo.
- **Timeouts e retry**: timeout explícito em toda chamada; retry com backoff
  exponencial só em erro transitório (5xx/timeout), no máximo 3 vezes;
  `429` respeita `Retry-After`.
- **Respostas do Pluggy são `unknown`** até passarem por schema Zod no
  `PluggyClient` (`04-padroes-codigo.md`). Campo novo/ausente não derruba o
  sync: a transação inválida é registrada em `SyncIssue` (sem o conteúdo
  sensível) e o resto segue.
- **Cartão de crédito**: mapear fatura/vencimento/limite quando o banco
  fornecer; parcelas (`installment`) e cartão adicional (últimos 4 dígitos →
  `CardHolderHint`) quando disponíveis.

## Webhooks (opcional: não existem no Meu Pluggy)

> Só entra se um dia houver plano pago. Com o Meu Pluggy o sync é por job e por botão.

`POST /banking/webhooks/pluggy` — única rota pública sem sessão (`@Public()`).

- **Autenticada por segredo**: o header (ou parâmetro) configurado ao
  registrar o webhook no Pluggy é comparado com `PLUGGY_WEBHOOK_SECRET` em
  **tempo constante** (`timingSafeEqual`). Sem segredo válido: `401`, sem
  detalhe. (Confirmar na documentação do Pluggy o mecanismo exato de
  autenticação de webhook e ajustar este item.)
- **O payload é só um aviso**, nunca fonte de dado: o handler extrai o
  `itemId`, enfileira um sync e **busca os dados de novo no Pluggy pela API
  autenticada**. Um webhook forjado, no pior caso, dispara um sync inútil.
- Resposta rápida (`202`), trabalho em background; idempotente (o mesmo
  evento repetido não duplica nada).
- Rate limit próprio e limite de body pequeno (64 KB).

## Consentimento e ciclo de vida

- **Correção de uma hipótese anterior**: o consentimento do Open Finance **não tem validade fixa de 12
  meses**. Pela documentação do Pluggy, por padrão ele **não expira** (algumas instituições têm prazo,
  ex.: 1 ano), e só deixa de valer se **expirar ou o usuário revogar no app do banco**. Nesses casos os
  endpoints de dados passam a devolver **vazio**.
- Regra de produto: **dado que vem vazio de repente é "reconectar", nunca "sem gastos"**. O sync compara
  com o histórico: se um item que tinha movimento passa a voltar vazio, marca o item como precisando
  reconectar e mostra o aviso. **Nunca apaga** o que já foi importado.
- Quando o item trouxer uma data de expiração do consentimento (campo a confirmar no primeiro item), o
  job diário avisa com **30 e 7 dias** (in-app + e-mail), uma vez por limiar.
- Reconectar é um `PATCH` no **mesmo** item (o usuário refaz o consentimento); o `Account` é
  reaproveitado e o histórico não quebra.
- Erros de credencial/`LOGIN_ERROR`/`OUTDATED` viram estado visível com ação;
  nunca falha silenciosa.
- **Desconectar**: revoga o Item no Pluggy (best effort + retry) e marca as
  contas como desconectadas; **não apaga** transações já importadas.
- **Excluir conta do sistema**: revoga todos os Items **antes** de apagar
  dados locais; se a revogação falhar, a exclusão local prossegue mas o
  evento fica registrado para nova tentativa e o usuário é avisado de que
  pode revogar também no app do banco.

## Import OFX/CSV

Fallback para qualquer conta sem conector e caminho do MVP para a fatura do
cartão de crédito (Sprint 2). Regras de produto em `03-regras-negocio.md`; segurança do upload em
`08-seguranca.md` § 6. Cada conta `IMPORT` guarda um **mapa de colunas** do
CSV do banco (data, descrição, valor, sinal) para a segunda importação ser um
toque; o primeiro import mostra a pré-visualização.

## Fora de escopo (v1)

- Iniciação de pagamento/Pix (write) — nunca.
- Investimentos e dados cadastrais.
- Múltiplos agregadores (Belvo, etc.): a fronteira é o `PluggyClient`; trocar
  de agregador é reimplementar esse client, não o domínio.
