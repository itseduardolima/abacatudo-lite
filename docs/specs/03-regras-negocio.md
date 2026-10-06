# Regras de Negócio

Fonte da verdade de comportamento. Toda feature nova precisa ser consistente
com este arquivo ou atualizá-lo junto. Todo valor em **centavos inteiros**;
todo "mês" e "dia" em `America/Manaus`.

## Escopo: o que o sistema gerencia (leia primeiro)

Decisão de produto: **só compra no cartão de crédito é gerenciada.** Débito,
Pix, TED, boleto, saque, saldo de benefício (VR/VA) e demais movimentações
de conta **podem ser exibidos, mas em telas e funcionalidades separadas**, e
nunca se misturam com a gestão.

| Vale só para compra no cartão de crédito        | Vale para débito, Pix, benefício e contas ("Movimentações") |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Categoria, regras, IA de categoria              | Lista/extrato, filtros e busca                              |
| Pessoa (meu x não é meu, padrão é meu), divisão | Totais de entrada e saída do mês (só informativos)          |
| Fatura "só a minha parte"                       | Rótulo de transferência entre contas próprias               |
| Orçamento, envelopes, alertas, ritmo, parcelas  | Nota opcional por lançamento                                |
| Relatórios, assinaturas, "onde economizar"      | —                                                           |
| Resumo e chat da IA                             | —                                                           |

- **Cartão = cartão de crédito.** O que decide é o **tipo da conta**
  (`Account.type = CREDIT_CARD`), sem heurística por lançamento: toda
  transação de uma conta de cartão de crédito é gerenciada, e toda transação
  de qualquer outra conta é movimentação. Não existe "na dúvida", nem campo
  de canal por lançamento.
- **Benefício (VR/VA) é tratado como renda**: o User informa o valor mensal
  no orçamento (ver "Orçamento mensal"). Os saldos e Pix da Bee Vale e da
  InfinitePay são contas comuns de movimentação; mover o dinheiro entre elas
  e para outros bancos (Bee Vale → InfinitePay → Nubank) não afeta nada de
  gestão.
- **Consequência assumida**: gasto no débito, no Pix ou no saldo do benefício
  **não entra** no orçamento nem nos relatórios. Por isso renda, benefício e
  gastos fixos são **informados por você** (ver "Orçamento mensal"), em vez de
  detectados nas movimentações.
- A API rejeita (`422 NOT_A_CARD_TRANSACTION`) categoria, pessoa, split ou
  regra em lançamento de conta que não é `CREDIT_CARD`.
- `TransactionRepository` só devolve lançamentos de contas `CREDIT_CARD`;
  `MovementRepository` só devolve os das demais — uma tela ou relatório não
  consegue misturar os dois por acidente.

## Usuários e acesso

- **User** é quem faz login. Só existe um papel (o dono dos próprios dados) —
  não há admin, não há visão de outro User.
- **Cadastro só por convite.** O primeiro User nasce pelo seed
  (`SEED_USER_*`). Um User logado pode gerar **um convite por vez** (token de
  32 bytes aleatórios, o banco guarda só o SHA-256, uso único, validade 72h,
  emitir novo invalida o anterior) e envia por e-mail. Quem aceita define a
  própria senha. Não existe rota de cadastro aberto.
- **Dados de um User nunca são visíveis a outro**, nem para quem convidou.
  Convidar não cria vínculo de dados.
- **Ações sensíveis exigem senha de novo** (reautenticação, válida 5 min):
  conectar/desconectar banco, exportar dados, excluir conta, desligar 2FA.
- **Excluir conta** apaga tudo do User (dados locais + revoga os Items no
  Pluggy) — irreversível, com confirmação explícita. Ver 08 § 13.

## Autenticação

- E-mail + senha (mínimo 12 caracteres, verificada contra lista de senhas
  comuns). Hash argon2id.
- **2FA por TOTP**: opcional em v1, mas o app pede na primeira semana e
  mostra aviso enquanto estiver desligado. Com 2FA ligado, gera 10 códigos
  de recuperação de uso único (guardados como hash).
- Rate limit de login: 5 tentativas / 15 min por e-mail **e** por IP.
  Mensagem sempre genérica ("E-mail ou senha incorretos").
- Sessão em cookie `httpOnly`, expira após 30 dias **sem uso** (janela
  deslizante); logout invalida no servidor (`Session` com `revokedAt`).
  Trocar senha revoga todas as outras sessões.
- Redefinir senha: link de uso único, 1h, resposta `204` sempre (não
  confirma se o e-mail existe).

## Pessoas (Person)

- Todo User tem uma Person `isSelf = true`, criada junto com a conta, não
  removível.
- O User cadastra familiares como Person (`name`, cor opcional). Person não
  faz login e não é User.
- Person com transações não pode ser apagada; pode ser **arquivada** (some
  das listas de escolha, o histórico fica).
- Nome de Person é dado pessoal de terceiro: guardado só como rótulo, sem
  CPF, telefone ou qualquer outro dado (ver 08 § 13). A mensagem de conta
  (§ Mensagem de conta) abre o WhatsApp **sem número**: o User escolhe o
  contato lá.

## Contas (Account)

- Tipos: `CREDIT_CARD` (a única gerenciada), `CHECKING` (conta corrente,
  débito, carteira de benefício — qualquer conta que não seja cartão de
  crédito) e `CASH`. O tipo decide o escopo (ver "Escopo"); no import manual
  o User escolhe o tipo da conta.
- Origem (`source`): `PLUGGY` (sincronizada), `IMPORT` (OFX/CSV) ou
  `MANUAL`. Uma conta tem uma origem só.
- Conta `PLUGGY` é somente leitura: o User não edita valor/data de uma
  transação vinda do banco — só classifica (categoria, pessoa, divisão,
  observação). Conta `MANUAL`/`IMPORT` aceita edição completa.
- Cartão de crédito guarda `closingDay`, `dueDay` e `creditLimitCents` (do
  banco quando disponível, senão informado).
  Fechamento e vencimento são editáveis em Contas (`⋮` > Fechamento e vencimento) e, quando o banco não
  informa (Pic Pay), o sync **não** apaga o que o usuário digitou.
- **Cartão adicional / virtual**: `CardHolderHint` mapeia os 4 últimos
  dígitos de um cartão a uma Person — toda transação daquele cartão já chega
  com a pessoa preenchida (a forma mais limpa de separar, ver "Atribuição de
  pessoa").

## Transações (Transaction)

Campos de negócio: `accountId`, `amountCents` (sempre positivo),
`direction` (`OUT` | `IN`), `occurredAt`, `description` (original do banco,
imutável), `merchant`
(normalizado), `kind`, `installment?` (`{number, total}`), `externalId`
(idempotência), `note?`. **Só em conta `CREDIT_CARD`**: `categoryId?`,
`personId?` e splits.

`kind`: `EXPENSE`, `REFUND`, `INCOME`, `CARD_PAYMENT` (a linha de pagamento
da fatura, dos dois lados) e `TRANSFER` (entre contas do próprio User, só
rótulo em Movimentações).

- **Idempotência**: `(accountId, externalId)` é único. Sincronizar de novo
  nunca duplica.
- **Pendente vs. lançada**: transação `PENDING` do banco pode mudar de valor
  ou sumir; quando vira lançada, atualiza a mesma linha (mesmo `externalId`
  ou reconciliação por valor+data+merchant), preservando a classificação do
  User.
- **Classificação do User nunca é sobrescrita por sincronização.** Sync só
  atualiza campos de origem (valor, data, descrição, status).
- `REFUND` reduz o gasto da categoria/pessoa da compra original quando
  vinculado; sem vínculo, entra como devolução na própria categoria.

### O que o Pluggy entrega e como vira regra (verificado com dado real)

Detalhe e números em [07-integracao-bancaria](./07-integracao-bancaria.md) § Formato dos dados.

- **Cartão de crédito**: compra = `DEBIT` (valor positivo); pagamento de fatura e estorno = `CREDIT` (negativo).
  A regra vale pelo **tipo**, nunca pelo sinal.
- **Parcelas futuras**: transação com `date` depois de hoje é **parcela futura** (vem `PENDING`): fica fora do
  mês corrente e dos totais, e só aparece em "parcelas futuras" e na **fatura prevista** (ver "Fatura prevista").
- **Fatura**: agrupa por `billId`; as pendentes (sem `billId`) pertencem à fatura aberta. A fatura já fechada
  **não entra** em "Meu em [mês]", no ritmo nem no total do cartão. **O total é o quanto falta pagar**, como no app do banco: o pagamento de
  fatura (`CARD_PAYMENT`) quita primeiro a fatura fechada, e só a **sobra** (pagamentos desde o último
  fechamento − total da fatura fechada, se positiva) abate a aberta, no "Meu" (o "Não é meu" não muda). O total da
  fatura fechada vem do valor informado em Contas ou, na falta dele, da última fatura fechada que o Pluggy manda;
  sem nenhum dos dois, não abate nada. Vale na Início e na tela da fatura, em todos os cartões. Cartão
  com `closingDay` (ex.: Pic Pay, que o Pluggy não manda fatura): só lançamento a partir do último fechamento é
  fatura aberta. O próprio dia de fechamento já conta, à meia-noite de Brasília (como no Nubank); parcela vale
  pela data de vencimento, não pela da compra. O dia é fixo: o banco antecipa o fechamento em fim de semana e
  feriado, então pode errar uns dias (limitação conhecida; a data do último fechamento chegou a existir e foi
  removida a pedido).
- **Cartão adicional**: o final do cartão de cada transação (`cardNumber`) já resolve a pessoa via
  `CardHolderHint`, antes de qualquer classificação manual.

## Atribuição de pessoa ("meu" x "não é meu")

**Decisão de produto (2026-09-22): toda transação nasce "Meu".** Não existe
fila de pendência — o User corrige depois, transação a transação ou em
lote, quando for de outra pessoa. Isso troca uma fila que precisa ser
zerada por uma correção pontual quando alguém da família usa o cartão.

Ordem do pipeline na criação (sync ou lançamento manual), parando no
primeiro que decidir:

1. **Já confirmada pelo User** → nunca muda sozinha, nem em re-sync.
2. **Cartão adicional/virtual** (`CardHolderHint`), quando existir (2.3).
3. **Regra do User** (`Rule` com `personId`): por estabelecimento, por conta,
   por faixa de valor, ou combinação.
4. **Sem regra** → o Dono (`Person` `isSelf`). É o padrão de toda transação
   nova; nunca fica sem pessoa.

Regras:

- **Padrão é "Meu".** Toda transação de cartão de crédito nasce atribuída
  ao Dono; entra no orçamento normalmente até o User corrigir. Quem
  compartilha o cartão com frequência com a mesma pessoa deve criar uma
  `Rule` (item 3) pra não precisar corrigir toda vez.
- Corrigir a pessoa (trocar pra outra Person, ou `Dividir`) em 1 toque; ao
  corrigir, o app oferece **"sempre que for este estabelecimento"** (cria
  `Rule`).
- Corrigir em lote: selecionar várias e aplicar uma pessoa.
- **Divisão (`Split`)**: uma transação pode ser dividida entre Persons com
  valores em centavos; a soma dos splits **tem que ser igual** ao total (a
  API rejeita se não fechar). "Dividir igualmente" distribui o resto de
  centavos determinísticamente (primeiro os primeiros). Cada split conta
  para a Person dele, na categoria da transação.
- Compra parcelada mantém a pessoa nas parcelas futuras (a regra vale para
  o grupo de parcelas).

## Categorias e regras

- Categorias padrão vêm do seed (Mercado, Alimentação fora, Combustível,
  Transporte, Moradia, Contas fixas, Saúde, Lazer, Assinaturas, Educação,
  Compras, Viagem, Outros). O User cria/renomeia/arquiva as dele.
- Pipeline de categoria, parando no primeiro que decidir:
  1. Confirmada pelo User → intocável.
  2. `Rule` do User (prioridade por especificidade, depois mais recente).
  3. Mesmo `merchant` normalizado já confirmado pelo User.
  4. **Sugestão da IA** (se ligada, ver [10-ia](./10-ia.md)): entra como
     `categorySuggested` com confiança; só vira categoria efetiva se
     confiança >= limiar **ou** o User aceitar. Abaixo do limiar fica
     "sem categoria".
  5. Sem categoria.
- Corrigir uma categoria pergunta se vale para "todas deste estabelecimento"
  (cria/atualiza `Rule` e reaplica retroativamente só nas ainda não
  confirmadas).
- `Rule` é do User (RLS). Não existe regra global compartilhada entre Users.

## Movimentações (Pix e contas) — área separada

Tudo que **não** é compra no cartão de crédito (débito, Pix, TED, boleto,
saque, benefício). É consulta, não gestão: telas próprias,
endpoints próprios (`/movements`), módulo próprio (`movement`).

- **O que existe**: lista/extrato de todas as contas, com filtro por conta,
  direção (entrada/saída), mês e busca por contraparte/descrição; **totais
  de entrada e saída do mês**, rotulados como "não entram no orçamento"; nota
  opcional por lançamento.
- **O que NÃO existe aqui**: categoria, pessoa, divisão, regra, envelope,
  alerta, relatório de economia e IA. Nada de Movimentações alimenta o
  orçamento ou os relatórios do cartão. **Exceção única**: o extrato e o
  resumo descritivo da conta de benefício (§ abaixo).
- **Rótulos informativos (P2)**: lançamento que casa com outro em **conta
  própria** (mesmo valor, sentidos opostos, <= 2 dias) recebe o rótulo
  "transferência entre suas contas" (`kind = TRANSFER`) para não parecer
  gasto no extrato — caso real: Bee Vale → InfinitePay → Nubank. Se houver
  mais de um candidato, **não rotula** (ambíguo). O saldo de pagamento de
  fatura na conta corrente recebe o rótulo `CARD_PAYMENT`. Esses rótulos não
  mudam nenhum total do orçamento (que já ignora tudo o que não é cartão).
- **Pagamento de fatura nunca vira gasto em dobro por construção**: as
  compras entram uma a uma pelo cartão; o pagamento fica em Movimentações
  (conta corrente) e a linha `CARD_PAYMENT` do lado do cartão é excluída do
  gasto.
- **Dado de terceiros**: Pix traz nome do favorecido/pagador. Fica só nesta
  área (extrato e a lista de Pix por favorecido do benefício, consultas do
  próprio User) — não vai para relatório do cartão, insight, export nem IA
  (ver 08 § 13 e 10-ia).
- **Benefício (VR/VA)**: a recarga aparece aqui como entrada, só
  informativa. O valor mensal do benefício que vale para o orçamento é o que
  o User **informa** (ver "Orçamento mensal").

### Extrato e relatório da conta de benefício

Tela própria (`/movements/benefit`, dentro da área Extrato) para a conta
marcada como **benefício** (`isBenefitAccount`, `CHECKING`). É **consulta
descritiva**: calculada em código, testada, sem LLM, e **nunca** alimenta o
orçamento, o ritmo do cartão, os relatórios do cartão nem a IA. Os endpoints
recebem `accountId` (para outra conta corrente entrar depois sem refazer a
API), mas a UI só expõe o benefício por enquanto.

- **Período do benefício**: o dinheiro do mês entra no dia 30 do mês anterior, então o "mês" da conta de
  benefício vai do **dia 30 do mês anterior** (inclusive) ao **dia 30 do mês** (exclusive), em `America/Manaus`
  (dia 30 em mês curto cai no último dia). Vale para extrato, resumo, saídas por dia, Pix e hábitos; o ritmo
  do benefício divide o saldo pelos dias até o próximo dia 30.
- **Extrato**: a mesma lista de Movimentações filtrada pela conta, com o
  **saldo atual** e "atualizado em" (do sync) no topo; mês selecionável.
- **Resumo do mês** (aba "Resumo"): entradas, saídas e resultado; **ritmo do
  benefício** = saldo atual ÷ dias restantes do mês (só no mês atual; não é o
  ritmo do orçamento e não o altera); **saídas por dia** (barras) com o
  acumulado do mês. Entradas e saídas são as registradas pelo banco: repasse
  entre contas próprias só deixa de contar quando existir o rótulo
  `TRANSFER` (§ Rótulos informativos).
- **Pix por favorecido**: só Pix **enviados** (saídas cuja descrição começa
  com "Pix ", convenção dos bancos; limitação declarada, trocar por
  `operationType` real se o sync passar a guardá-lo). Agrupa pelo nome do
  favorecido normalizado (sem acento, caixa baixa, espaços colapsados) e
  mostra, por favorecido, o **total**, a **quantidade** e a **data do último**,
  do maior total para o menor, com busca por nome. Tocar num favorecido abre
  os Pix dele no mês. **Não classifica** favorecido como pessoa ou
  estabelecimento (sem heurística por nome ou CNPJ); marcar isso à mão é
  evolução futura.
- **Para onde vai** (aba "Resumo", mês escolhido): as saídas agrupadas pelo
  nome do estabelecimento (sem a cidade), do maior total para o menor, com
  total, quantidade e data da última; os 10 maiores aparecem e o resto entra em
  "outros". Fecham a conta três blocos à parte: **Pix enviados** (total, detalhe
  na lista de Pix), **pagamento de fatura** e "outros". Invariante testada:
  estabelecimentos + outros + Pix + pagamento de fatura = saídas do mês. Sem
  categoria (categorias do benefício, se vierem, usam a mesma lista do cartão e
  exigem exceção própria neste spec).
- **Gastos que se repetem** (só estabelecimentos; **Pix fica de fora**, repetição
  de Pix é ruído e dado de terceiros):
  - **Recorrentes**: o mesmo detector de assinaturas do cartão (valor ±10%,
    ~30 dias, >= 3 ocorrências, ativa se a última cobrança tem até 40 dias), olhando
    os últimos 4 meses, independente do mês escolhido. Mostra valor mensal, dia
    da cobrança e quantas vezes.
  - **Mais frequentes**: no mês escolhido, estabelecimentos com 2 ou mais
    compras, ordenados por quantidade e depois por total, com a data da última.
    Pega o que não é mensal (corrida, lanche), que o detector não pega.
  - Sem categoria: só agrupa pelo nome do estabelecimento (sem a cidade).
- **Privacidade**: o nome do favorecido aparece só aqui e no extrato, para o
  próprio User; nunca em relatório do cartão, insight, export, prompt ou log
  (08 § 13).
- **Dinheiro e agrupamento vêm do backend**; o front só exibe.
- Invariante testada: total por favorecido somado = total dos Pix enviados do
  mês; entradas − saídas = resultado.

## Só a minha parte (gasto de terceiros no meu cartão)

Decisão de produto: **o sistema não controla dívida da família.** Não existe
"valor a receber", abatimento, saldo por pessoa nem "marcar como pago". O que
o User quer é enxergar **só o que é dele**. A cobrança acontece fora do
sistema, por uma **mensagem de texto que o User gera e envia manualmente**
(§ Mensagem de conta).

- Gasto atribuído a uma Person que **não é self** é simplesmente
  **subtraído** da visão do User: não entra no orçamento, no total "meu
  gasto do mês" nem nos relatórios de categoria/estabelecimento (que são
  sempre "meus").
- **Fatura do cartão mostra a conta inteira e o desconto**, sempre nesta
  ordem:

  ```
  Fatura            R$ 2.000,00   (o que o banco cobra)
  − Não é meu       R$   700,00   (soma das Persons não-self + splits delas)
  = Meu             R$ 1.300,00   (o número que vale para o orçamento)
  ```

  O valor de destaque é **"Meu"**. Como toda transação nasce "Meu" (ver
  "Atribuição de pessoa"), não existe uma terceira faixa de pendência — o
  que ainda não foi corrigido já conta como "Meu" até o User editar.

- Invariante testada: `Fatura = Meu + Não é meu`, para qualquer fatura e
  qualquer combinação de splits (centavo a centavo).

- **Fatura prevista (meses futuros)**: a Home e a tela da Fatura navegam por mês (◀ ▶). Um mês **posterior ao
  atual** mostra a fatura **prevista** daquele cartão:
  - **Parcelas lançadas pelo banco** (`installment`, `PENDING`, `date` no mês) **mais parcelas estimadas**. Compra à
    vista futura ainda não existe, e assinatura recorrente não é projetada.
  - **Parcela estimada** (nem todo banco expõe as futuras: BB e Pic Pay só mandam a parcela quando ela cai na
    fatura): para cada compra parcelada cuja última parcela conhecida é `k` de `N` (`k < N`), criam-se as
    parcelas `k+1..N` com o **mesmo valor** e a **mesma data de vencimento, mês a mês** a partir da última
    conhecida (dia limitado ao fim do mês). Nunca é gravada: é recalculada a cada consulta. Quando o banco
    lança a parcela de verdade, ela vira a referência (`k` sobe) e a estimada some sozinha, sem duplicar; se o
    banco já manda todas as parcelas (Nubank), nada é estimado. A pessoa e a divisão da compra valem para as
    estimadas. Só entram em mês **posterior ao atual**. Sempre marcadas **"estimada"** (na tela, com o
    quanto da fatura é estimado, e no texto da conta) e podem errar poucos centavos ou dias.
  - **Mês da parcela = mês de `date`** em `America/Manaus` (mesma regra de "Formato dos dados", spec 07); não
    depende de `closingDay`/`dueDay`.
  - Mesmo formato e mesma invariante da fatura atual (`Fatura = Meu + Não é meu`); a pessoa da compra vale para
    todas as parcelas do grupo (ver "Atribuição de pessoa"). Sem saldo anterior, sem `CARD_PAYMENT`.
  - Rotulada **"Prevista"**. **Nunca** entra no ritmo, no orçamento, no "Meu em [mês]" da Home nem em relatório.
  - **Horizonte**: até o mês da última parcela existente **em qualquer cartão**; a
    seta ▶ só habilita até lá (contando as estimadas) e anda igual para todos os cartões
    (o cartão sem parcela naquele mês mostra fatura zerada). A seta ◀ para no mês
    atual (não guardamos histórico de faturas fechadas).
- **Split** entre self e outras Persons conta para o "Meu" só a fatia do
  self.
- `Person` continua existindo só como **rótulo de quem gastou** (para
  classificar, dividir e responder "quanto foi da fulana este mês" de forma
  meramente informativa). Sem saldo, sem marcar pago/em aberto; a cobrança é só
  a mensagem manual de conta.
- O gasto de terceiros continua **visível** (lista de lançamentos filtrada
  por pessoa, e o "Não é meu" da fatura), mas fora de todos os totais "meus".
- Reembolso que a família fizer por Pix aparece em Movimentações como
  qualquer entrada; **não abate nada** (não há saldo) e não afeta o "Meu".

### Mensagem de conta (WhatsApp)

O User gera, **um clique por vez**, o texto da conta de cada Person não-self e
o envia pelo WhatsApp. O sistema **nunca envia sozinho**, não guarda telefone
e não registra se foi enviado, pago ou recebido.

- **Quem**: cada Person não-self com valor > 0 na fatura do mês escolhido
  (Person arquivada só entra se tiver compra no mês). Split entra só com a
  **fatia da Person**.
- **Qual fatura**: a **aberta** (a mesma da tela Fatura), sem o saldo da fatura
  já fechada (a composição dele não é atribuível a pessoas). Mês futuro usa a
  fatura prevista (parcelas lançadas e estimadas, estas marcadas) e sai marcado como previsão. Como a
  fatura aberta muda até o fechamento, o valor enviado pode diferir do final.
- **Conteúdo**: só o total, cada compra com o valor e a parcela `n/N` (a
  última vira `n/N - última`), uma seção por cartão (o nome do cartão só
  aparece quando há mais de um), e "Pagar até dia X" com o
  `dueDay` do cartão (sem `dueDay`, a linha some).
- **Nome na fatura**: a compra tem um apelido opcional (`displayName`) que
  substitui o nome do banco no texto. Vale para **todas as parcelas** da
  compra (inclusive as futuras) e o sync nunca o sobrescreve. Sem apelido, usa
  o estabelecimento ou a descrição do banco.
- **Texto e dinheiro vêm do backend** (função pura, testada); o front só
  codifica e abre `wa.me/?text=` ou copia. Centavos formatados em pt-BR.
- Invariante testada: Meu + soma das Persons = fatura aberta sem saldo
  anterior, centavo a centavo.

## Orçamento mensal

Definido pelo User em `BudgetSettings` (mensal):

```
teto variável = renda mensal (fixa + benefícios)
              − gastos fixos previstos
              − meta de poupança
```

- **Renda e benefício são informados pelo User** (salário mensal e valor
  mensal de VR/VA), não detectados: como Pix e contas estão fora da gestão,
  o sistema não tem como saber o que é renda. VR/VA soma na renda porque o
  User move o valor livremente entre contas.
- **Gastos fixos previstos** (aluguel, contas pagas por Pix/boleto) também são
  informados: o sistema não os enxerga como compra no cartão.
- **Sem envelopes nem alertas de limite** (descartados em 2026-09-25): o orçamento é só o teto e o ritmo.
- Só entra no orçamento: **compra no cartão de crédito** (conta `CREDIT_CARD`,
  `kind = EXPENSE`), com `personId` = self (ou split de self), no mês de
  `occurredAt`. Não entram: nada que não seja cartão de crédito (débito, Pix
  etc.), a linha `CARD_PAYMENT` e gastos de outras Persons.
- **Quinzena**: a renda é informada em dois salários, o da 1ª quinzena (dia 15, cobre os dias 1–15) e o da
  2ª (dia 30, cobre 16–fim do mês); o teto mensal é a soma. Cada gasto fixo tem uma quinzena de pagamento
  (1ª, 2ª ou dividido meio a meio, o centavo ímpar na 2ª; editável). No mês atual, o gasto da quinzena = minha parte nas compras de cartão **com data dentro da
  quinzena** (parcela pela data de vencimento, fatura fechada fora) + gastos fixos daquela quinzena, contra o
  salário dela. O card mostra, na barra do mês, um marcador no teto do dia 15 com o quanto já foi gasto na 1ª quinzena
  (só no mês atual). Ao lado do "Sobram" do mês, "Sobram até dia 15" (1ª quinzena) ou "até dia 30" (2ª): o salário da
  quinzena atual menos o gasto dela.
- **Ritmo**: compara o gasto do mês (fatura aberta somada em todos os
  cartões + gastos fixos ativos) com o esperado linear até hoje, sobre o
  teto; sinaliza se está acima. O card da Início mostra também **quanto foi gasto
  nos cartões de crédito, somando todos, só a minha parte** (sem o que não é meu), calculado no backend (`cardsMineCents`). O card acompanha
  o mês escolhido nas setas da Início: num **mês futuro** mostra o **previsto**
  (fatura prevista de cada cartão, com parcelas lançadas e estimadas, mais os gastos fixos)
  contra o teto daquele mês, sem selo "No ritmo" nem marcador de hoje. Só existe
  `BudgetMonth` gravado para o mês atual e o seguinte; nos meses além disso o
  teto é **projetado** do mês configurado mais recente, só na resposta (nada é
  gravado). Mês passado sem linha continua zero.
- **Compras parceladas**: cada parcela conta no mês em que o banco a lança.
  O total de parcelas futuras já comprometidas é mostrado à parte ("já
  comprometido nos próximos meses"); não é somado ao mês corrente.
- Virada de mês: novo `BudgetMonth` copia as configurações do anterior;
  meses fechados são **imutáveis** para o orçamento (editar renda de hoje
  não reescreve o passado).

## Relatórios e insights (determinísticos)

Todos calculados em código, testados, sem LLM ([10-ia](./10-ia.md) só narra),
e **só sobre compras no cartão** (Pix e contas ficam de fora):

- **Por categoria / por estabelecimento / por pessoa**, mês a mês, com
  variação vs. mês anterior e vs. média dos 3 meses anteriores. Total,
  categoria e estabelecimento são **só a parte do dono** (mesma regra da
  fatura: divisão = a fatia dele); "por pessoa" mostra todas. Cada **parcela
  conta no mês em que cai** (mês da compra + nº da parcela − 1, aproximação),
  não tudo no mês da compra. No **mês corrente**, os meses de comparação só
  contam **até o mesmo dia** (compra à vista; parcela conta inteira); mês
  passado compara mês inteiro. Grupo com líquido zero (compra e estorno) não
  aparece.
- **Assinaturas e recorrências**: mesmo `merchant` normalizado, valor
  semelhante (±10%), intervalo ~30 dias (±4), >= 3 ocorrências. Lista com
  total mensal e total anual (12x o mensal). Só compra à vista (parcela
  nunca é assinatura) e só a parte do dono; sem `merchant`, agrupa pela
  descrição normalizada. Uma compra avulsa de outro valor no meio não quebra
  a sequência, e cobrança colada (< 26 dias) não conta como ocorrência. Só
  lista a **ativa**: última cobrança há até 40 dias.
- **Cobrança duplicada**: mesmo `merchant` + valor em janela de 24h.
- **Categoria acima do normal**: gasto do mês > 140% da média dos 3 meses
  anteriores (mínimo de 3 meses de histórico).
- **Parcelas futuras**: soma por mês dos `installment` restantes (é a mesma conta da fatura prevista).
- **Onde economizar**: ranking por potencial = variação para cima +
  recorrências candidatas a cancelar + categorias acima do normal; cada
  item traz o cálculo por trás (nunca só um texto).

## Sincronização bancária

- Sync **diário automático + "atualizar agora"** (limite: 1 por conta a cada 15 min). Sem webhook: o
  caminho gratuito (Meu Pluggy) não oferece (ver 07).
- **Consentimento**: não tem validade fixa de 12 meses (só expira em alguns bancos, ou se o usuário
  revogar no app do banco). Se o item tiver data de expiração, avisar com 30 e 7 dias de antecedência
  (in-app + e-mail). **Dado que vem vazio de repente é "reconectar", nunca "sem gastos"**. Item com
  erro/expirado/revogado não apaga dados já importados.
- Desconectar um banco: revoga o Item no Pluggy; as transações já
  importadas **permanecem** (histórico), marcadas como conta desconectada.
- Falha de sync nunca mostra número parcial como se fosse completo: o
  dashboard indica "última atualização" por conta.

## Import OFX/CSV e lançamento manual

- Import aceita `.ofx` e `.csv` até 5 MB; mostra **pré-visualização**
  (quantas novas, quantas já existentes, quantas parecem transferência)
  antes de gravar.
- Idempotência do import: `externalId` do OFX (`FITID`) quando existe; senão
  hash de `(data, valor, descrição, ordem no arquivo)`.
- Lançamento manual: valor, data, conta, descrição, categoria, pessoa. Vale
  só para contas `MANUAL`/`IMPORT`.

## Exportação e privacidade

- O User exporta os próprios dados (CSV/JSON) — exige reautenticação. Todo
  campo de texto do CSV exportado é neutralizado contra injeção de fórmula
  (prefixo `'` em valores que começam com `=`, `+`, `-`, `@`).
- Ver 08 § 13 (LGPD) para exclusão de conta e dado de terceiros.
