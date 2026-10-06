# Visão Geral do Produto

## O que é

**AbacaTudo** (repositório `abacatudo-lite`, versão enxuta do `gastos-web`): sistema web (PWA, uso principal no celular) de gestão de gastos pessoais.
Puxa automaticamente os dados de cartões e contas via Open Finance (agregador
Pluggy), separa o que é gasto do próprio dono do que é gasto de terceiros
(família que usa o cartão dele), aplica um limite mensal derivado da renda
fixa, mostra onde o dinheiro vai e onde dá para economizar, e tem uma IA para
explicar os números e responder perguntas.

Nasceu de um caso real: um usuário com cartões no Nubank, Banco do Brasil e
PicPay, que empresta cartão para a família.

## Por que web/PWA

- Um único código para celular (uso diário) e desktop (análise/relatório).
- Sem loja de app, instalável na tela inicial.
- Diferente do PDV, **não é offline-first**: o valor está em dado bancário
  sincronizado, que já exige rede. O PWA cacheia leitura (último mês visto)
  e mostra estado "sem conexão"; escrita (classificar, editar) exige rede.

## Por que multiusuário desde o início

O dono convida **uma** pessoa para usar o sistema. Cada uma tem conta própria
e dados 100% separados — nada de "conta compartilhada". Isso decide o modelo
de dados agora (todo registro pertence a um `User`, isolado por RLS, ver
[08-seguranca](./08-seguranca.md) § 1), porque adicionar isso depois é
reescrever o banco. Não é um SaaS aberto: cadastro só por convite.

## Escopo v1

- Conexão com bancos via Pluggy (Nubank, Banco do Brasil, PicPay) + importação
  OFX/CSV e lançamento manual para o que não tiver conector (Bee Vale,
  InfinitePay — a validar, ver [07](./07-integracao-bancaria.md)).
- Categorização automática (regras + IA) com correção fácil.
- **Separação por pessoa** (eu / familiares): caixa "a classificar", regras
  que aprendem e divisão de uma compra entre pessoas. O gasto de terceiros é
  **subtraído**: a fatura mostra o total, desconta o que não é seu e destaca
  só o valor que é seu. Sem controle de dívida: a única "cobrança" é uma
  **mensagem de texto** que o próprio User gera e envia, na mão, pelo WhatsApp
  (03 § Mensagem de conta).
- **Gestão só do cartão de crédito**: categoria, pessoa, orçamento,
  relatórios e IA valem apenas para compras no cartão de crédito.
- Orçamento mensal a partir da renda fixa, com envelopes por categoria e
  alertas.
- Relatórios: categorias, estabelecimentos, comparação mês a mês,
  assinaturas/recorrências, parcelas futuras, anomalias.
- IA: categorização, resumo mensal com sugestões de economia, chat sobre os
  próprios dados (ver [10-ia](./10-ia.md)).

## Fora de escopo (v1)

- Movimentar dinheiro (Pix, pagamento, transferência) — o sistema é
  **somente leitura** em relação aos bancos.
- Investimentos, imposto de renda, contas a pagar/boleto.
- Extrato, conta corrente, débito, Pix e saldo de benefício: nada disso é
  sincronizado nem exibido. O sistema só trata cartão de crédito.
- Controle de dívida da família (valor a receber, saldo por pessoa, marcar
  pago, abatimento) e qualquer envio **automático** de cobrança. Decisão de
  produto: o gasto de terceiros é subtraído da visão; a única saída é a
  mensagem manual de conta (03 § Mensagem de conta).
- Múltiplos usuários compartilhando os mesmos dados (household). Cada conta
  é isolada; se um dia for necessário, é um módulo novo, não um relaxamento
  do isolamento.
- App nativo, multi-moeda.
- Score de crédito, oferta de produto financeiro, qualquer monetização.

## Glossário

| Termo              | Significado                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| User               | Quem tem conta no sistema (login). Dados isolados dos demais Users                            |
| Person             | Quem gastou: o próprio User (`isSelf`) ou um familiar. Não faz login                          |
| Account            | Cartão de crédito (a única conta que o sync cria)                                             |
| Transaction        | Um lançamento em uma Account                                                                  |
| Categoria          | Classificação do gasto (Mercado, Combustível...)                                              |
| Rule               | Regra criada pelo User: "estabelecimento X = categoria Y / pessoa Z"                          |
| A classificar      | Transação ainda sem `Person` confirmada                                                       |
| Meu                | Parte do gasto que é do próprio User (`personId` = self, ou a fatia self de um split)         |
| Não é meu          | Gasto de outra Person no cartão do User. Subtraído da visão; sem saldo nem controle de dívida |
| Orçamento (Budget) | Teto mensal de gasto do User, derivado da renda fixa                                          |
| Envelope           | Parcela do orçamento reservada a uma categoria                                                |
| Item (Pluggy)      | Uma conexão autorizada com uma instituição via Open Finance                                   |
